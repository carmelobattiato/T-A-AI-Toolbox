import { Express, NextFunction, Request, Response } from 'express';
import { AuthUser } from '../src/types/index.ts';
import { userStore, UserError, SESSION_TTL_MS } from './userStore.ts';
import { internalError } from './http.ts';
import { portalIdentity, portalAutoCreateEnabled, portalCookiePresent, LEGACY_OPT_OUT_COOKIE } from './portalAuth.ts';
import { db } from './store.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      // The portal cookie is there, but it does not give access (invalid token, unknown or disabled user)
      portalDenied?: boolean;
    }
  }
}

const COOKIE_NAME = 'adm_session';
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Viewers read everything and may propose needs (see create_need), but never change a practice
export function canEdit(user: AuthUser | null | undefined, practiceId: string): boolean {
  if (!user || !user.active) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'viewer') return false;
  return user.practices.includes(practiceId);
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx !== -1 && part.slice(0, idx).trim() === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

function isHttps(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  return req.secure || (Array.isArray(proto) ? proto[0] : proto)?.split(',')[0].trim() === 'https';
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const attrs = [`${COOKIE_NAME}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`];
  if (isHttps(req)) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(req: Request, res: Response) {
  const attrs = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (isHttps(req)) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

// Resolves the session cookie to req.user on every request; anonymous requests simply have no user
// Local session first; without one, a valid portal cookie signs the user in
export async function attachUser(req: Request, res: Response, next: NextFunction) {
  req.user = userStore.userFromToken(readCookie(req, COOKIE_NAME)) ?? undefined;
  if (!req.user) {
    try {
      const identity = await portalIdentity(req);
      const user = identity ? portalUser(identity) : null;
      if (user) {
        // Portal users never have to change a password
        req.user = { ...user, mustChangePassword: false };
        setSessionCookie(req, res, userStore.signToken(user, true));
      }
    } catch (err) {
      console.error('Portal autologin failed:', err);
    }
  }
  req.portalDenied = !req.user && portalCookiePresent(req);
  next();
}

// Existing user → signed in (disabled users never). Unknown name → created as viewer, if auto-creation is on.
function portalUser(identity: { username: string; displayName: string }): AuthUser | null {
  const existing = userStore.findAnyByUsername(identity.username);
  if (existing) return existing.active ? existing : null;
  if (!portalAutoCreateEnabled()) return null;
  try {
    const { user, created } = userStore.createPortalUser(identity.username, identity.displayName);
    if (created) {
      console.log(`Portal login: new user "${user.username}" created with role viewer`);
      db.addAuditLog('portal', 'CREATE', 'USER', user.id, { username: user.username, role: 'viewer', source: 'portal' });
    }
    return user;
  } catch {
    return null; // not a valid username: nothing is created
  }
}

// Sends 401/403 and returns false when the caller may not write on the practice
export function authorizeEdit(req: Request, res: Response, practiceId: string): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to edit data' });
    return false;
  }
  if (!canEdit(req.user, practiceId)) {
    res.status(403).json({ error: 'You do not have permission to edit this practice' });
    return false;
  }
  return true;
}

// Anyone, logged in or not, may submit a need (esigenza). Anonymous submissions are rate limited
// per client address so the map cannot be flooded.
const ANON_NEEDS_PER_HOUR = 20;
const anonymousNeeds = new Map<string, number[]>();

export function anonymousNeedAllowed(ip: string): boolean {
  const now = Date.now();
  const recent = (anonymousNeeds.get(ip) ?? []).filter(t => now - t < 60 * 60 * 1000);
  if (recent.length >= ANON_NEEDS_PER_HOUR) {
    anonymousNeeds.set(ip, recent);
    return false;
  }
  recent.push(now);
  anonymousNeeds.set(ip, recent);
  return true;
}

// Like authorizeEdit, but needs can be created by everybody
export function authorizeCreate(req: Request, res: Response, practiceId: string, type: unknown): boolean {
  if (type !== 'NEED') return authorizeEdit(req, res, practiceId);
  if (!req.user && !anonymousNeedAllowed(req.ip ?? 'unknown')) {
    res.status(429).json({ error: 'Too many needs submitted: try again later or sign in' });
    return false;
  }
  return true;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'This operation is restricted to administrators' });
    return;
  }
  next();
}

export function sendError(res: Response, err: unknown) {
  if (err instanceof UserError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  internalError(res, err);
}

// In-memory brute-force protection: failed attempts per username and per client address
const failures = new Map<string, { count: number; until: number }>();

function lockedFor(key: string, limit: number): number {
  const entry = failures.get(key);
  if (!entry) return 0;
  if (entry.until < Date.now()) {
    failures.delete(key);
    return 0;
  }
  return entry.count >= limit ? Math.ceil((entry.until - Date.now()) / 1000) : 0;
}

function recordFailure(key: string, limit: number) {
  const entry = failures.get(key);
  if (!entry || entry.until < Date.now()) failures.set(key, { count: 1, until: Date.now() + LOCKOUT_MS });
  else entry.count = Math.min(entry.count + 1, limit);
}

export function registerAuthRoutes(app: Express) {
  app.use(attachUser);

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
      const userKey = `u:${username}`;
      const ipKey = `ip:${req.ip}`;
      const wait = Math.max(lockedFor(userKey, MAX_FAILED_LOGINS), lockedFor(ipKey, MAX_FAILED_LOGINS * 4));
      if (wait > 0) {
        res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minutes` });
        return;
      }
      const user = userStore.verifyLogin(username, req.body?.password);
      if (!user) {
        recordFailure(userKey, MAX_FAILED_LOGINS);
        recordFailure(ipKey, MAX_FAILED_LOGINS * 4);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      failures.delete(userKey);
      setSessionCookie(req, res, userStore.signToken(user));
      res.json({ user });
    } catch (err) {
      sendError(res, err);
    }
  });

  // TEST ONLY (needs PORTAL_AUTOLOGIN_INSECURE=1, otherwise 404): lets ./test.sh give the browser the portal cookie
  // by just opening a URL, since a script cannot set cookies in the browser by itself. Remove together with the flag.
  app.get('/api/auth/test-portal-cookie', (req: Request, res: Response) => {
    if (process.env.PORTAL_AUTOLOGIN_INSECURE !== '1') {
      res.status(404).end();
      return;
    }
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(token) || token.length > 4096) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    const cookieName = process.env.PORTAL_COOKIE_NAME || 'portal_session';
    res.append('Set-Cookie', `${cookieName}=${token}; Path=/; SameSite=Lax`);
    // Start clean: no previous local session
    res.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    res.redirect('/');
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    // Tidy up the cookie an earlier version left in some browsers
    res.append('Set-Cookie', `${LEGACY_OPT_OUT_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
    res.json({ success: true });
  });

  // Own default practice (chosen at first login, changeable later). Any signed-in user, any role.
  app.patch('/api/auth/default-practice', (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in to continue' });
      return;
    }
    try {
      const practiceIds = db.getPractices().map(p => p.id);
      const user = userStore.setDefaultPractice(req.user.id, req.body?.practiceId, practiceIds);
      res.json({ user });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ user: req.user ?? null, portalDenied: Boolean(req.portalDenied) });
  });

  app.post('/api/auth/password', (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in to continue' });
      return;
    }
    // Only administrators change their own password; other users' passwords are not changed from the app
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Only administrators can change their password here' });
      return;
    }
    try {
      const user = userStore.changePassword(req.user.id, req.body?.currentPassword, req.body?.newPassword);
      // Changing the password invalidates every old token: keep this session alive with a fresh one
      setSessionCookie(req, res, userStore.signToken(user));
      res.json({ user });
    } catch (err) {
      sendError(res, err);
    }
  });
}
