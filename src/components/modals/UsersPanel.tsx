import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, UserPlus, ShieldCheck, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuthUser, Practice, UserRole } from '../../types/index.ts';
import { useAuth } from '../../auth/AuthContext.tsx';

interface FormState {
  id: string | null; // null = new user
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  password: string;
  practices: string[];
}

const PAGE_SIZE = 10;

const EMPTY_FORM: FormState = { id: null, username: '', displayName: '', role: 'editor', active: true, password: '', practices: [] };

async function apiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export const UsersPanel: React.FC = () => {
  const { user: me, refresh } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const [usersRes, practicesRes] = await Promise.all([fetch('/api/users'), fetch('/api/practices')]);
    if (!usersRes.ok) {
      setError(await apiError(usersRes, 'Unable to load users'));
      return;
    }
    setUsers(await usersRes.json());
    if (practicesRes.ok) setPractices(await practicesRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const practiceName = (id: string) => practices.find(p => p.id === id)?.name ?? id;

  // Searchable text per user: name, username, role and the practices they can edit
  const searchable = (u: AuthUser) =>
    [u.displayName, u.username, u.role, u.role === 'admin' ? 'all practices' : u.practices.map(practiceName).join(' ')]
      .join(' ')
      .toLowerCase();
  const term = query.trim().toLowerCase();
  const filtered = term ? users.filter(u => searchable(u).includes(term)) : users;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        displayName: form.displayName,
        role: form.role,
        practices: form.role === 'viewer' ? [] : form.practices,
        active: form.active,
      };
      if (form.password) body.password = form.password;
      if (!form.id) body.username = form.username;
      const res = await fetch(form.id ? `/api/users/${form.id}` : '/api/users', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await apiError(res, 'Save failed'));
      setForm(null);
      await load();
      // The edited user may be the one logged in here
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u: AuthUser) => {
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    setError('');
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(await apiError(res, 'Delete failed'));
      return;
    }
    await load();
  };

  const togglePractice = (id: string) =>
    setForm(f => (f ? { ...f, practices: f.practices.includes(id) ? f.practices.filter(p => p !== id) : [...f.practices, id] } : f));

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Admins can view and edit all practices. Editors can edit only the selected practices; everywhere else they are read-only.
        </p>
        {!form && (
          <button
            type="button"
            onClick={() => setForm({ ...EMPTY_FORM })}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" /> New user
          </button>
        )}
      </div>

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, username, role or practice"
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold text-slate-500">
          {filtered.length} {filtered.length === 1 ? 'user' : 'users'}
        </span>
      </div>

      {form && (
        <form onSubmit={save} className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
          <h4 className="text-xs font-bold text-slate-800">{form.id ? `Edit ${form.username}` : 'New user'}</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Username
              <input
                value={form.username}
                disabled={Boolean(form.id)}
                onChange={e => setForm({ ...form, username: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Display name
              <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className={inputClass} />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              {form.id ? 'New password (leave empty to keep it unchanged)' : 'Temporary password'}
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Role
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className={inputClass}>
                <option value="viewer">Viewer (can add needs only)</option>
                <option value="editor">Editor (selected practices)</option>
                <option value="admin">Admin (everything)</option>
              </select>
            </label>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">Editable practices</div>
            {form.role === 'admin' ? (
              <p className="text-xs text-slate-500">An admin can edit all practices.</p>
            ) : form.role === 'viewer' ? (
              <p className="text-xs text-slate-500">A viewer reads everything and can add needs, but cannot edit any practice. Promote to editor to choose practices.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {practices.map(p => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                      form.practices.includes(p.id) ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <input type="checkbox" checked={form.practices.includes(p.id)} onChange={() => togglePractice(p.id)} className="accent-purple-600" />
                    {p.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="accent-purple-600" />
            Active user (can sign in)
          </label>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setForm(null); setError(''); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (!form.id && (!form.username.trim() || !form.password))}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Save user
            </button>
          </div>
        </form>
      )}

      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
        {pageUsers.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-500">No users match "{query}".</p>
        )}
        {pageUsers.map(u => (
          <div key={u.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="truncate">{u.displayName}</span>
                <span className="text-xs font-normal text-slate-400">@{u.username}</span>
                {u.role === 'admin' && (
                  <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                    <ShieldCheck className="w-3 h-3" /> admin
                  </span>
                )}
                {u.role === 'viewer' && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">viewer</span>
                )}
                {!u.active && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">disabled</span>}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {u.role === 'admin'
                  ? 'All practices'
                  : u.role === 'viewer'
                    ? 'Viewer: can add needs only'
                    : u.practices.length ? u.practices.map(practiceName).join(', ') : 'No practices: read-only'}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="Edit"
                onClick={() => setForm({ id: u.id, username: u.username, displayName: u.displayName, role: u.role, active: u.active, password: '', practices: [...u.practices] })}
                className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg hover:bg-purple-50 cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
              {u.id !== me?.id && (
                <button type="button" title="Delete" onClick={() => remove(u)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <span className="font-semibold">
            Page {currentPage} of {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
