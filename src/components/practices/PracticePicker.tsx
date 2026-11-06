import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Practice } from '../../types/index.ts';
import { PracticeIcon } from './PracticeIcon.tsx';

interface PracticePickerProps {
  practices: Practice[];
  value: string | null;
  onChange: (practiceId: string) => void;
  // Shows the tiles without letting the user pick one (returning users change it from the menu)
  readOnly?: boolean;
  // Height of the scrolling tile area (there can be many practices)
  listClassName?: string;
}

// Searchable grid of practice tiles (icon, name, short description); the grid scrolls vertically
export const PracticePicker: React.FC<PracticePickerProps> = ({
  practices,
  value,
  onChange,
  readOnly = false,
  listClassName = 'max-h-96',
}) => {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();

  const visible = useMemo(
    () =>
      needle
        ? practices.filter(p => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(needle))
        : practices,
    [practices, needle]
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search a practice by name or description..."
          aria-label="Search practices"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        />
      </div>

      {visible.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-slate-500">No practice matches "{query.trim()}".</p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Practice"
          className={`grid grid-cols-1 gap-3 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-4 ${listClassName}`}
        >
          {visible.map(p => {
            const selected = p.id === value;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={readOnly}
                title={p.description || p.name}
                onClick={() => onChange(p.id)}
                className={`flex min-h-[9.5rem] flex-col rounded-2xl border bg-white p-3.5 text-left transition ${
                  selected
                    ? 'border-purple-500 ring-2 ring-purple-500/25 shadow-sm'
                    : 'border-slate-200'
                } ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-purple-300 hover:shadow-sm'}`}
              >
                <span className="flex items-start justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      selected ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <PracticeIcon icon={p.icon} className="h-4 w-4" />
                  </span>
                  {selected && <Check className="h-4 w-4 text-purple-700" />}
                </span>
                <span className="mt-3 block truncate text-sm font-bold text-slate-900">{p.name}</span>
                {p.description && (
                  <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500">{p.description}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
