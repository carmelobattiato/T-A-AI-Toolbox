import crypto from 'crypto';
import { Request } from 'express';

// Single sign-on from the portal: the portal links to this tool and passes its session cookie
// (a JWT). If the user named in it exists here, they are signed in without a login form.

const DEFAULT_COOKIE = 'portal_session';
const DEFAULT_ISSUER = 'portal-genai-auth';
const DEFAULT_AUDIENCE = 'portal-backend';
const JWKS_TTL_MS = 10 * 60 * 1000;

export const PORTAL_OPT_OUT_COOKIE = 'adm_no_autologin';

interface JwtClaims {
  name?: unknown;
  preferred_username?: unknown;
  email?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  [key: string]: unknown;
}

let jwksCache: { keys: (JsonWebKey & { kid?: string })[]; fetchedAt: number } | null = null;

// Verification key: PEM from config, or the matching key (by kid) from the portal JWKS endpoint.
// Returns null when no key is configured.
async function publicKeyFor(kid: string | undefined): Promise<crypto.KeyObject | null | 'unavailable'> {
  const pem = process.env.PORTAL_JWT_PUBLIC_KEY;
  if (pem) return crypto.createPublicKey(pem);

  const url = process.env.PORTAL_JWKS_URL;
  if (!url) return null;

  if (!jwksCache || Date.now() - jwksCache.fetchedAt > JWKS_TTL_MS) {
    try {
      const res = await fetch(url, { redirect: 'error' });
      if (!res.ok) return 'unavailable';
      const body = await res.json();
      jwksCache = { keys: Array.isArray(body?.keys) ? body.keys : [], fetchedAt: Date.now() };
    } catch {
      return 'unavailable';
    }
  }
  const jwk = jwksCache.keys.find(k => (kid ? k.kid === kid : true));
  if (!jwk) return 'unavailable';
  return crypto.createPublicKey({ key: jwk as unknown as crypto.JsonWebKey, format: 'jwk' });
}

function decodeJwt(token: string): { header: any; claims: JwtClaims; signed: string; signature: Buffer } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return { header, claims, signed: `${parts[0]}.${parts[1]}`, signature: Buffer.from(parts[2], 'base64url') };
  } catch {
    return null;
  }
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

// Short fingerprint of the portal cookie currently sent (null if none). A logout is remembered against it,
// so the same portal session does not sign the user straight back in, but a new portal login does.
export function portalTokenFingerprint(req: Request): string | null {
  const token = readCookie(req, process.env.PORTAL_COOKIE_NAME || DEFAULT_COOKIE);
  return token ? crypto.createHash('sha256').update(token).digest('hex').slice(0, 16) : null;
}

// The local username the portal cookie points to, or null (no cookie, invalid token, unknown user).
export async function portalUsername(req: Request): Promise<string | null> {
  const cookieName = process.env.PORTAL_COOKIE_NAME || DEFAULT_COOKIE;
  const token = readCookie(req, cookieName);
  if (!token) return null;

  const decoded = decodeJwt(token);
  if (!decoded) return null;
  const { header, claims, signed, signature } = decoded;

  // Only RS256 is accepted: never "none" and never HMAC with a public key
  if (header?.alg !== 'RS256') return null;

  const issuer = process.env.PORTAL_JWT_ISSUER || DEFAULT_ISSUER;
  const audience = process.env.PORTAL_JWT_AUDIENCE || DEFAULT_AUDIENCE;
  if (claims.iss !== issuer) return null;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(audience)) return null;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;

  const insecure = process.env.PORTAL_AUTOLOGIN_INSECURE === '1';
  if (insecure) {
    console.warn('[portal autologin] PORTAL_AUTOLOGIN_INSECURE is on: the portal signature is NOT verified. Testing only.');
  } else {
    const key = await publicKeyFor(typeof header.kid === 'string' ? header.kid : undefined);
    if (key === 'unavailable') return null;
    if (!key) return null; // no key configured: autologin is off
    const valid = crypto.verify('RSA-SHA256', Buffer.from(signed), key, signature);
    if (!valid) return null;
  }

  const raw = [claims.name, claims.preferred_username, claims.email]
    .find(v => typeof v === 'string' && v.trim()) as string | undefined;
  if (!raw) return null;
  // email style ("carmelo.battiato@accenture.com") → local part, matched to the username
  return raw.trim().toLowerCase().split('@')[0] || null;
}
