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
  LogIn,
  LogOut,
  KeyRound,
  Eye,
  HelpCircle,
} from 'lucide-react';
import { AuthUser, Practice } from '../../types/index.ts';
import { PracticeSwitcher } from './PracticeSwitcher.tsx';
import { ADM_DEFINITION } from '../../utils/adm.ts';

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
  practices: Practice[];
  practiceId: string;
  onSelectPractice: (practiceId: string) => void;
  onCreatePractice: (name: string) => Promise<string | null>;
  user: AuthUser | null;
  isAdmin: boolean;
  // False for anonymous visitors and users without rights on the current practice
  canEditPractice: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
  onStartTour: () => void;
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
  practices,
  practiceId,
  onSelectPractice,
  onCreatePractice,
  user,
  isAdmin,
  canEditPractice,
  onLogin,
  onLogout,
  onChangePassword,
  onStartTour,
}) => {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between gap-4 select-none">
      {/* Brand Zone */}
      <div className="group relative flex items-center gap-3 shrink-0 cursor-help" tabIndex={0}>
        {/* Accent Purple Chevron Logo */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-purple-500/20">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z" />
          </svg>
        </div>
        <div>
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-purple-900 bg-clip-text text-transparent block leading-tight">
            ADM Project Blueprint
          </span>
          <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
            Collaborative map by practice
          </span>
          <span className="text-[9px] text-slate-400 font-medium hidden sm:block">
            developed by Carmelo Battiato - V.1.1.0
          </span>
        </div>

        {/* What ADM stands for, shown while hovering or focusing the application name */}
        <div
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-[360px] max-w-[90vw] translate-y-1 rounded-xl bg-slate-900 p-4 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-2xl ring-1 ring-white/10 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100"
        >
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-purple-300">Accenture Delivery Methods</div>
          {ADM_DEFINITION}
        </div>
      </div>

      {/* Practice switcher: every practice has its own map */}
      <PracticeSwitcher
        practices={practices}
        practiceId={practiceId}
        onSelectPractice={onSelectPractice}
        canCreate={isAdmin}
        onCreate={onCreatePractice}
      />

      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={e => onFilterChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Search tools, WiPs, needs..."
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
        {/* View switch: Map / Dashboard */}
        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
          {([
            { id: 'map', label: 'Map', Icon: MapIcon },
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

        <button
          type="button"
          onClick={onStartTour}
          title="Replay the intro tour"
          className="p-2 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings (admins only): AI engine, users, practices */}
        {isAdmin && <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer relative"
          title="Configure the OpenAI API or a custom endpoint"
        >
          <Settings className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden sm:inline">Settings</span>
          {isCustomAiActive && (
            <span
              title="Custom OpenAI active"
              className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"
            />
          )}
        </button>}

        {/* Add Phase Button */}
        {canEditPractice && <button
          type="button"
          onClick={onNewPhase}
          className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold transition-all cursor-pointer"
          title="Add a new process phase"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New phase</span>
        </button>}

        {/* Audit Log Button */}
        <button
          type="button"
          onClick={onOpenAuditLog}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Change log and audit log"
        >
          <History className="w-4 h-4" />
        </button>

        {!canEditPractice && (
          <span
            title={user ? 'You do not have permission to edit this practice: you can still add needs' : 'Sign in to edit the data: you can add needs even without signing in'}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold"
          >
            <Eye className="w-3 h-3" /> Read-only
          </span>
        )}

        {/* Login / user menu */}
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(open => !open)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                {user.displayName.slice(0, 2)}
              </span>
              <span className="hidden sm:inline max-w-[110px] truncate">{user.displayName}</span>
            </button>
            {userMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl text-xs font-medium"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-2.5 py-1.5 text-[10px] text-slate-400">
                  @{user.username} · {user.role === 'admin' ? 'admin' : 'editor'}
                </div>
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); onChangePassword(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Change password
                </button>
                <button
                  type="button"
                  onClick={() => { setUserMenuOpen(false); onLogout(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </button>
        )}

      </div>
    </header>
  );
};
