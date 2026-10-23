import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AuthUser, UserRole } from '../src/types/index.ts';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'Admin!2026';
const USERNAME_RE = /^[a-zA-Z0-9._@-]{3,64}$/;

interface StoredUser extends AuthUser {
  passwordHash: string;
  tokenVersion: number;
  createdAt: string;
}

interface UsersFile {
  secret: string;
  users: StoredUser[];
}

export class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function checkPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

// Compared against when the username does not exist, so response time does not reveal valid usernames
const DUMMY_HASH = hashPassword(crypto.randomBytes(8).toString('hex'));

function publicUser(u: StoredUser): AuthUser {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    practices: [...u.practices],
    active: u.active,
    mustChangePassword: u.mustChangePassword,
  };
}

function cleanPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
    throw new UserError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }
  if (value.length > 200) throw new UserError('Password is too long');
  return value;
}

class UserStore {
  private file: UsersFile;

  constructor() {
    this.file = this.load();
  }

  // Re-reads users.json after the file was replaced on disk (data import)
  reload() {
    this.file = this.load();
  }

  private write(data: UsersFile) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    // Atomic write with owner-only permissions: the file holds password hashes and the signing secret
    const tmpFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmpFile, USERS_FILE);
  }

  private load(): UsersFile {
    if (fs.existsSync(USERS_FILE)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        if (typeof parsed.secret === 'string' && Array.isArray(parsed.users)) {
          // Users saved while practices were still called pillars
          for (const u of parsed.users) {
            if (u.pillars !== undefined) {
              u.practices ??= u.pillars;
              delete u.pillars;
            }
            u.practices ??= [];
          }
          return parsed;
        }
        throw new Error('users.json has an unexpected shape');
      } catch (e) {
        // Never overwrite an unreadable user file: that would silently reset every account
        const corruptFile = `${USERS_FILE}.corrupt-${Date.now()}`;
        fs.renameSync(USERS_FILE, corruptFile);
        console.warn(`Unreadable users.json moved to ${corruptFile}:`, e);
      }
    }
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    const data: UsersFile = {
      secret: crypto.randomBytes(32).toString('hex'),
      users: [
        {
          id: `user-${Date.now()}`,
          username: DEFAULT_ADMIN_USERNAME,
          displayName: 'Administrator',
          role: 'admin',
          practices: [],
          active: true,
          mustChangePassword: false,
          passwordHash: hashPassword(adminPassword),
          tokenVersion: 1,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    this.write(data);
    console.log(`Created default admin user "${DEFAULT_ADMIN_USERNAME}" (change the password at first login).`);
    return data;
  }

  private persist() {
    this.write(this.file);
  }

  private secret(): string {
    return process.env.AUTH_SECRET || this.file.secret;
  }

  // --- Sessions ---
  // sso: session created from the portal cookie; those users never have to change a password
  signToken(user: AuthUser, sso = false): string {
    const stored = this.find(user.id)!;
    const claims: Record<string, unknown> = { u: stored.id, v: stored.tokenVersion, exp: Date.now() + SESSION_TTL_MS };
    if (sso) claims.s = 1;
    const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const sig = crypto.createHmac('sha256', this.secret()).update(body).digest('base64url');
    return `${body}.${sig}`;
  }

  // Returns the current user for a valid, unexpired token; permissions are always read live from the store
  userFromToken(token: string | undefined): AuthUser | null {
    if (!token) return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', this.secret()).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
      const claims = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
      if (typeof claims.exp !== 'number' || claims.exp < Date.now()) return null;
      const user = this.find(claims.u);
      if (!user || !user.active || user.tokenVersion !== claims.v) return null;
      return { ...publicUser(user), ...(claims.s === 1 ? { mustChangePassword: false } : {}) };
    } catch {
      return null;
    }
  }

  // Active user by username, ignoring case; never creates anybody
  findActiveByUsername(username: string): AuthUser | null {
    const name = username.trim().toLowerCase();
    const user = this.file.users.find(u => u.username.toLowerCase() === name);
    return user && user.active ? publicUser(user) : null;
  }

  verifyLogin(username: unknown, password: unknown): AuthUser | null {
    const name = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const user = this.file.users.find(u => u.username.toLowerCase() === name);
    const ok = checkPassword(typeof password === 'string' ? password : '', user ? user.passwordHash : DUMMY_HASH);
    return user && user.active && ok ? publicUser(user) : null;
  }

  // --- Users ---
  private find(id: string): StoredUser | undefined {
    return this.file.users.find(u => u.id === id);
  }

  private activeAdmins(): number {
    return this.file.users.filter(u => u.role === 'admin' && u.active).length;
  }

  listUsers(): AuthUser[] {
    return this.file.users.map(publicUser);
  }

  getUser(id: string): AuthUser | null {
    const u = this.find(id);
    return u ? publicUser(u) : null;
  }

  createUser(
    input: { username?: unknown; displayName?: unknown; password?: unknown; role?: unknown; practices?: unknown },
    validPracticeIds: string[],
  ): AuthUser {
    const username = typeof input.username === 'string' ? input.username.trim() : '';
    if (!USERNAME_RE.test(username)) {
      throw new UserError('Invalid username (3-64 characters: letters, numbers, . _ @ -)');
    }
    if (this.file.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new UserError('Username already in use', 409);
    }
    const role: UserRole = input.role === 'admin' ? 'admin' : 'editor';
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username,
      displayName: (typeof input.displayName === 'string' && input.displayName.trim().slice(0, 80)) || username,
      role,
      practices: this.cleanPractices(input.practices, validPracticeIds),
      active: true,
      // Passwords set by an admin are temporary: the user picks their own at first login
      mustChangePassword: false,
      passwordHash: hashPassword(cleanPassword(input.password)),
      tokenVersion: 1,
      createdAt: now,
    };
    this.file.users.push(user);
    this.persist();
    return publicUser(user);
  }

  private cleanPractices(value: unknown, validPracticeIds: string[]): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((p): p is string => typeof p === 'string' && validPracticeIds.includes(p)))];
  }

  updateUser(
    id: string,
    input: { displayName?: unknown; password?: unknown; role?: unknown; practices?: unknown; active?: unknown },
    validPracticeIds: string[],
  ): AuthUser | null {
    const user = this.find(id);
    if (!user) return null;

    const nextRole: UserRole = input.role === undefined ? user.role : input.role === 'admin' ? 'admin' : 'editor';
    const nextActive = typeof input.active === 'boolean' ? input.active : user.active;
    const losesAdmin = user.role === 'admin' && user.active && (nextRole !== 'admin' || !nextActive);
    if (losesAdmin && this.activeAdmins() <= 1) {
      throw new UserError('At least one active administrator must remain');
    }

    if (typeof input.displayName === 'string' && input.displayName.trim()) {
      user.displayName = input.displayName.trim().slice(0, 80);
    }
    if (input.practices !== undefined) user.practices = this.cleanPractices(input.practices, validPracticeIds);
    user.role = nextRole;
    if (user.active && !nextActive) user.tokenVersion += 1;
    user.active = nextActive;
    if (input.password !== undefined && input.password !== '') {
      user.passwordHash = hashPassword(cleanPassword(input.password));
      user.mustChangePassword = false;
      user.tokenVersion += 1;
    }
    this.persist();
    return publicUser(user);
  }

  deleteUser(id: string, actingUserId: string): boolean {
    const user = this.find(id);
    if (!user) return false;
    if (id === actingUserId) throw new UserError('You cannot delete your own user');
    if (user.role === 'admin' && user.active && this.activeAdmins() <= 1) {
      throw new UserError('At least one active administrator must remain');
    }
    this.file.users = this.file.users.filter(u => u.id !== id);
    this.persist();
    return true;
  }

  changePassword(id: string, current: unknown, next: unknown): AuthUser {
    const user = this.find(id);
    if (!user || typeof current !== 'string' || !checkPassword(current, user.passwordHash)) {
      throw new UserError('Current password is incorrect', 403);
    }
    const password = cleanPassword(next);
    if (password === current) throw new UserError('The new password must be different from the current one');
    user.passwordHash = hashPassword(password);
    user.mustChangePassword = false;
    user.tokenVersion += 1;
    this.persist();
    return publicUser(user);
  }

  // A deleted practice must not stay in anyone's permissions
  removePractice(practiceId: string) {
    let changed = false;
    for (const user of this.file.users) {
      if (user.practices.includes(practiceId)) {
        user.practices = user.practices.filter(p => p !== practiceId);
        changed = true;
      }
    }
    if (changed) this.persist();
  }
}

export const userStore = new UserStore();
