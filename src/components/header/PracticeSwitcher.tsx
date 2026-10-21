import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Plus } from 'lucide-react';
import { Practice } from '../../types/index.ts';

interface PracticeSwitcherProps {
  practices: Practice[];
  practiceId: string;
  onSelectPractice: (practiceId: string) => void;
  // Only for users allowed to add practices (admins)
  canCreate: boolean;
  // Resolves to an error message, or null when the practice was created
  onCreate: (name: string) => Promise<string | null>;
}

export const PracticeSwitcher: React.FC<PracticeSwitcherProps> = ({ practices, practiceId, onSelectPractice, canCreate, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = practices.find(p => p.id === practiceId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    setAdding(false);
    setName('');
    setError('');
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const err = await onCreate(name.trim());
    setBusy(false);
    if (err) setError(err);
    else close();
  };

  return (
    <div ref={rootRef} data-tour="practice" className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Switch practice"
        className="flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-semibold text-purple-800 transition-colors cursor-pointer"
      >
        <Layers className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-500 hidden lg:inline">Practice</span>
        <span className="max-w-[140px] truncate">{active?.name ?? practiceId}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-xl text-xs font-medium z-50">
          <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Choose practice</div>
          {practices.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelectPractice(p.id);
                close();
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                p.id === practiceId ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="truncate">{p.name}</span>
              {p.id === practiceId && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}

          {canCreate && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              {adding ? (
                <form onSubmit={create} className="p-1.5 space-y-1.5">
                  <input
                    autoFocus
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      setError('');
                    }}
                    placeholder="New practice name"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  {error && <p className="text-[10px] font-semibold text-red-600">{error}</p>}
                  <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => { setAdding(false); setName(''); setError(''); }} className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-md cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={busy || !name.trim()} className="px-2.5 py-1 text-[11px] font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md cursor-pointer disabled:opacity-50">
                      Create
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-purple-700 hover:bg-purple-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New practice
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
