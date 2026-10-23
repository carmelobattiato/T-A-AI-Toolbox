import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser } from '../types/index.ts';

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  // True when the user may write on the practice (admins: every practice)
  canEdit: (practiceId: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const next: AuthUser | null = (await res.json()).user ?? null;
        // Same user as before: keep the same object, so nothing downstream re-renders
        setUser(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }
    } catch (e) {
      console.error('Failed to read the session:', e);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Picks up permission changes made by an admin, and expired sessions
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, 60000);
    return () => clearInterval(timer);
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Sign-in failed'));
    setUser((await res.json()).user);
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!res.ok) throw new Error(await readError(res, 'Password change failed'));
    setUser((await res.json()).user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === 'admin',
      // The server refuses writes until a temporary password has been changed
      canEdit: practiceId =>
        Boolean(user && (user.role === 'admin' || user.practices.includes(practiceId))),
      login,
      logout,
      changePassword,
      refresh,
    }),
    [user, login, logout, changePassword, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
