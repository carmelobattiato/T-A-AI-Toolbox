import React, { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { DEFAULT_PRACTICE_ID, Practice } from '../../types/index.ts';
import { IconKey } from '../../utils/iconKeys.ts';
import { IconPicker } from '../forms/IconPicker.tsx';
import { PracticeIcon } from '../practices/PracticeIcon.tsx';

interface PracticesPanelProps {
  // Called after any change so the map can reload the practice list
  onChanged: () => void;
}

async function apiError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return data.error || fallback;
}

export const PracticesPanel: React.FC<PracticesPanelProps> = ({ onChanged }) => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newIcon, setNewIcon] = useState<IconKey | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIcon, setEditIcon] = useState<IconKey | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/practices');
    if (res.ok) setPractices(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (request: Promise<Response>, fallback: string) => {
    setError('');
    const res = await request;
    if (!res.ok) {
      setError(await apiError(res, fallback));
      return false;
    }
    await load();
    onChanged();
    return true;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await run(
      fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDescription, icon: newIcon }),
      }),
      'Creation failed'
    );
    if (ok) {
      setNewName('');
      setNewDescription('');
      setNewIcon(null);
    }
  };

  const rename = async (id: string) => {
    const ok = await run(
      fetch(`/api/practices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, description: editDescription, icon: editIcon }),
      }),
      'Update failed'
    );
    if (ok) setEditingId(null);
  };

  const remove = async (p: Practice) => {
    if (!window.confirm(`Delete practice "${p.name}" with all its phases, tools, WiPs, needs and tiles? This action cannot be undone.`)) return;
    await run(fetch(`/api/practices/${p.id}`, { method: 'DELETE' }), 'Delete failed');
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500';

  return (
    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
      <p className="text-xs text-slate-500">
        Each practice has its own map of phases, tools, WiPs, needs and dashboard. A new practice starts with a single editable "Base phase".
        The description is shown to users when they choose their default practice.
      </p>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <form onSubmit={create} className="space-y-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New practice name (e.g. Operations)"
          className={inputClass}
        />
        <IconPicker value={newIcon} onChange={setNewIcon} />
        <textarea
          value={newDescription}
          onChange={e => setNewDescription(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="Description (required): the context this practice is for"
          className={`${inputClass} resize-none`}
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newName.trim() || !newDescription.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
        {practices.map(p => (
          <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
            {editingId === p.id ? (
              <div className="flex-1 space-y-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
                <IconPicker value={editIcon} onChange={setEditIcon} compact />
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  maxLength={200}
                  placeholder="Description (required)"
                  className="w-full resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                  <PracticeIcon icon={p.icon} className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                {p.description ? (
                  <span className="mt-0.5 block text-xs text-slate-500">{p.description}</span>
                ) : (
                  <span className="mt-0.5 block text-xs italic text-amber-600">No description yet: add one with Rename</span>
                )}
                </div>
              </div>
            )}
            <div className="flex shrink-0 items-center gap-1">
              {editingId === p.id ? (
                <>
                  <button type="button" title="Save" onClick={() => rename(p.id)} className="p-1.5 text-emerald-600 rounded-lg hover:bg-emerald-50 cursor-pointer">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" title="Cancel" onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    title="Rename or edit description"
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                      setEditDescription(p.description ?? '');
                      setEditIcon((p.icon as IconKey | null) ?? null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-purple-700 rounded-lg hover:bg-purple-50 cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {p.id !== DEFAULT_PRACTICE_ID && (
                    <button type="button" title="Delete" onClick={() => remove(p)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
