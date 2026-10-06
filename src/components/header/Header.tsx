import React from 'react';
import { FilterState } from '../../types/index.ts';
import {
  Search,
  X,
  Plus,
  History,
  RotateCcw,
  Settings,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onNewPhase: () => void;
  onOpenAuditLog: () => void;
  onResetSeed: () => void;
  onOpenSettings: () => void;
  isCustomAiActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterChange,
  onNewPhase,
  onOpenAuditLog,
  onResetSeed,
  onOpenSettings,
  isCustomAiActive = false,
}) => {
  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between gap-4 select-none">
      {/* Brand Zone */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Accent Purple Chevron Logo */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/20">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z" />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-purple-900 bg-clip-text text-transparent block leading-tight">
            T&A AI Toolbox
          </span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Mappa collaborativa Technology & Architecture
          </span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={e => onFilterChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Cerca tool, idee, esigenze..."
          className="w-full pl-9 pr-8 py-2 rounded-full border border-slate-200 bg-slate-50/80 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs transition-all text-slate-800 placeholder-slate-400"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      <div className="hidden lg:flex items-center gap-2.5 shrink-0 text-xs font-semibold">
        {/* Tool Filter Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ ...filters, showTools: !filters.showTools })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
            filters.showTools
              ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Tool</span>
          <div
            className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
              filters.showTools ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${
                filters.showTools ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        {/* Idee Filter Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ ...filters, showIdeas: !filters.showIdeas })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
            filters.showIdeas
              ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Idee</span>
          <div
            className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
              filters.showIdeas ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${
                filters.showIdeas ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        {/* Esigenze Filter Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ ...filters, showNeeds: !filters.showNeeds })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
            filters.showNeeds
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs'
              : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'
          }`}
        >
          <span>Esigenze</span>
          <div
            className={`w-7 h-4 rounded-full transition-colors relative flex items-center ${
              filters.showNeeds ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform transform ${
                filters.showNeeds ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </div>
        </button>

        {/* Solo da generalizzare Checkbox */}
        <label className="flex items-center gap-1.5 ml-1 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
          <input
            type="checkbox"
            checked={filters.onlyGeneralize}
            onChange={e => onFilterChange({ ...filters, onlyGeneralize: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <span className="font-medium text-xs">Da generalizzare</span>
        </label>
      </div>

      {/* Global Actions Zone (No individual user profile - General app for all) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Settings AI Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer relative"
          title="Configura API OpenAI o endpoint custom"
        >
          <Settings className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Settings AI</span>
          {isCustomAiActive && (
            <span
              title="OpenAI Custom attivo"
              className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            />
          )}
        </button>

        {/* Add Phase Button */}
        <button
          type="button"
          onClick={onNewPhase}
          className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all cursor-pointer"
          title="Aggiungi una nuova fase di processo"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuova fase</span>
        </button>

        {/* Audit Log Button */}
        <button
          type="button"
          onClick={onOpenAuditLog}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Registro modifiche e Audit Log"
        >
          <History className="w-4 h-4" />
        </button>

        {/* Reset Database Button */}
        <button
          type="button"
          onClick={onResetSeed}
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          title="Ripristina dati iniziali di test"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
