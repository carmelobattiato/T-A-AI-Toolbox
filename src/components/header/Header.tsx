import React from 'react';
import { FilterState } from '../../types/index.ts';
import {
  Search,
  X,
  Plus,
  History,
  Settings,
  Sparkles,
  Map as MapIcon,
  LayoutDashboard,
} from 'lucide-react';

export type AppView = 'map' | 'dashboard';

interface HeaderProps {
  view: AppView;
  onViewChange: (view: AppView) => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onNewPhase: () => void;
  onOpenAuditLog: () => void;
  onOpenSettings: () => void;
  isCustomAiActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  view,
  onViewChange,
  filters,
  onFilterChange,
  onNewPhase,
  onOpenAuditLog,
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
          <span className="text-[9px] text-slate-400 font-medium hidden sm:block">
            developed by Carmelo Battiato - V.1.0.2
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
          placeholder="Cerca tool, WiP, esigenze..."
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

      {/* Global Actions Zone (No individual user profile - General app for all) */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View switch: Mappa / Dashboard */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
          {([
            { id: 'map', label: 'Mappa', Icon: MapIcon },
            { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                view === id ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{label}</span>
            </button>
          ))}
        </div>

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

      </div>
    </header>
  );
};
