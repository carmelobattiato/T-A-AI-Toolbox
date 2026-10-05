import React, { useState } from 'react';
import { FilterState } from '../../types/index.ts';
import { Search, X, ChevronDown, Plus, History, RotateCcw, User, Shield } from 'lucide-react';

interface HeaderProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onNewPhase: () => void;
  onOpenAuditLog: () => void;
  onResetSeed: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  filters,
  onFilterChange,
  onNewPhase,
  onOpenAuditLog,
  onResetSeed,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
        <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-purple-900 bg-clip-text text-transparent">
          T&A AI Toolbox
        </span>
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
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Toggles (Pill style as in Screenshot 1) */}
      <div className="hidden lg:flex items-center gap-3 shrink-0 text-xs font-semibold">
        {/* Tool Filter Toggle */}
        <button
          type="button"
          onClick={() => onFilterChange({ ...filters, showTools: !filters.showTools })}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
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
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
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
        <label className="flex items-center gap-2 ml-1 cursor-pointer select-none text-slate-600 hover:text-slate-900 transition-colors">
          <input
            type="checkbox"
            checked={filters.onlyGeneralize}
            onChange={e => onFilterChange({ ...filters, onlyGeneralize: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          <span className="font-medium text-xs">Solo da generalizzare</span>
        </label>
      </div>

      {/* User Zone & Actions */}
      <div className="relative shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all text-xs"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            CB
          </div>
          <span className="font-semibold text-slate-800 hidden sm:inline">Carmelo Battiato</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>

        {/* User Dropdown */}
        {userMenuOpen && (
          <div
            className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={() => setUserMenuOpen(false)}
          >
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="font-bold text-xs text-slate-900">Carmelo Battiato</p>
              <p className="text-[11px] text-slate-500">carmelo.battiato@accenture.com</p>
              <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Technology & Architecture</p>
            </div>

            <div className="py-1 text-xs">
              <button
                type="button"
                onClick={onNewPhase}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Inserisci nuova fase</span>
              </button>
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700"
              >
                <History className="w-4 h-4 text-slate-500" />
                <span>Visualizza Audit Log</span>
              </button>
              <button
                type="button"
                onClick={onResetSeed}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-red-600"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Ripristina dati iniziali</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
