import React from 'react';
import { FilterState } from '../../types/index.ts';
import { CalendarDays, Tag, X, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

interface TypeToggleProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  onClasses: string;
  trackOnClass: string;
}

const TypeToggle: React.FC<TypeToggleProps> = ({ label, checked, onToggle, onClasses, trackOnClass }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
      checked ? onClasses : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
    }`}
  >
    <span>{label}</span>
    <div className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${checked ? trackOnClass : 'bg-slate-300'}`}>
      <div
        className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${
          checked ? 'translate-x-3.5' : 'translate-x-0.5'
        }`}
      />
    </div>
  </button>
);

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  const days = filters.maxAgeDays ?? 0;
  const isActive = filters.maxAgeDays !== null || filters.tagQuery.trim() !== '';

  return (
    <div className="shrink-0 z-30 min-h-12 py-1.5 bg-white/95 border-b border-slate-200 px-6 flex flex-wrap items-center gap-x-6 gap-y-2 select-none">
      <div className="flex items-center gap-2.5">
        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Creati</span>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={days}
          onChange={e => {
            const value = Number(e.target.value);
            onFilterChange({ ...filters, maxAgeDays: value === 0 ? null : value });
          }}
          className="w-44 accent-purple-600 cursor-pointer"
          aria-label="Filtra per giorni dalla creazione"
        />
        <span className="text-xs font-semibold text-purple-700 w-20 whitespace-nowrap">
          {filters.maxAgeDays === null ? 'Tutto' : `Ultimi ${filters.maxAgeDays} gg`}
        </span>
      </div>

      <div className="relative flex-1 min-w-48 max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Tag className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={filters.tagQuery}
          onChange={e => onFilterChange({ ...filters, tagQuery: e.target.value })}
          placeholder="Filtra per tag o cliente (es. Poste; Sog)"
          className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 transition-colors"
        />
        {filters.tagQuery && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, tagQuery: '' })}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
            title="Cancella filtro tag e clienti"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-xs font-semibold ml-auto">
        <TypeToggle
          label="Tool"
          checked={filters.showTools}
          onToggle={() => onFilterChange({ ...filters, showTools: !filters.showTools })}
          onClasses="bg-blue-50 border-blue-200 text-blue-700 shadow-2xs"
          trackOnClass="bg-blue-600"
        />
        <TypeToggle
          label="WiP"
          checked={filters.showIdeas}
          onToggle={() => onFilterChange({ ...filters, showIdeas: !filters.showIdeas })}
          onClasses="bg-purple-50 border-purple-200 text-purple-700 shadow-2xs"
          trackOnClass="bg-purple-600"
        />
        <TypeToggle
          label="Esigenze"
          checked={filters.showNeeds}
          onToggle={() => onFilterChange({ ...filters, showNeeds: !filters.showNeeds })}
          onClasses="bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs"
          trackOnClass="bg-emerald-600"
        />

        <label className="flex items-center gap-1.5 ml-1 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
          <input
            type="checkbox"
            checked={filters.onlyGeneralize}
            onChange={e => onFilterChange({ ...filters, onlyGeneralize: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="font-medium text-xs">Da generalizzare</span>
        </label>

        {isActive && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, maxAgeDays: null, tagQuery: '' })}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Azzera filtri</span>
          </button>
        )}
      </div>
    </div>
  );
};
