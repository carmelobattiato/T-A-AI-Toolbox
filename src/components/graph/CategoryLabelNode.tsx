import React, { useState } from 'react';
import { Wrench, ChevronsRight, Target, ChevronDown, Check, Plus } from 'lucide-react';
import { Practice } from '../../types/index.ts';

export type CategoryType = 'TOOL_IDEA' | 'PHASE' | 'NEED';

interface CategoryLabelData {
  category: CategoryType;
  title: string;
  subtitle: string;
  countLabel?: string;
  // Only the process label: the practice switcher
  practices?: Practice[];
  practiceId?: string;
  canCreatePractice?: boolean;
  onSelectPractice?: (practiceId: string) => void;
  onCreatePractice?: () => void;
}

export const CategoryLabelNode: React.FC<{ data: CategoryLabelData }> = ({ data }) => {
  const { category, title, subtitle, countLabel, practices, practiceId, canCreatePractice, onSelectPractice, onCreatePractice } = data;
  const [menuOpen, setMenuOpen] = useState(false);
  const hasSwitcher = category === 'PHASE' && practices && onSelectPractice;
  const activePractice = practices?.find(p => p.id === practiceId);

  const getConfig = () => {
    switch (category) {
      case 'TOOL_IDEA':
        return {
          borderAccent: 'border-l-blue-500',
          bgIcon: 'bg-blue-50 text-blue-600 border-blue-200',
          badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
          lineColor: 'border-blue-300',
          icon: <Wrench className="w-4 h-4 text-blue-600" />,
        };
      case 'PHASE':
        return {
          borderAccent: 'border-l-purple-600',
          bgIcon: 'bg-purple-50 text-purple-700 border-purple-200',
          badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
          lineColor: 'border-purple-300',
          icon: <ChevronsRight className="w-4 h-4 text-purple-600" />,
        };
      case 'NEED':
        return {
          borderAccent: 'border-l-emerald-500',
          bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          lineColor: 'border-emerald-300',
          icon: <Target className="w-4 h-4 text-emerald-600" />,
        };
    }
  };

  const config = getConfig();

  return (
    <div className={`relative select-none ${hasSwitcher ? '' : 'pointer-events-none'}`}>
      {/* Visual dashed anchor line pointing to the graph items */}
      <div
        className={`absolute left-full top-1/2 -translate-y-1/2 w-10 border-t-2 border-dashed ${config.lineColor} opacity-70`}
      />

      {/* Main card */}
      <div
        className={`w-[273px] bg-white/95 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-200/90 border-l-[5px] ${config.borderAccent} shadow-md transition-all duration-300`}
        style={{
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${config.bgIcon} shrink-0`}>
              {config.icon}
            </div>
            {hasSwitcher ? (
              <button
                type="button"
                onClick={() => setMenuOpen(open => !open)}
                title="Switch practice"
                className="nodrag nopan flex items-center gap-1 whitespace-nowrap font-extrabold text-[11px] text-slate-800 tracking-wider uppercase hover:text-purple-700 cursor-pointer"
              >
                {title}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="font-extrabold text-[11px] text-slate-800 tracking-wider uppercase">
                {title}
              </div>
            )}
          </div>
          {countLabel && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${config.badgeBg}`}
            >
              {countLabel}
            </span>
          )}
        </div>
        {hasSwitcher && activePractice && (
          // Current practice, as wide as the card; also opens the practice list
          <button
            type="button"
            onClick={() => setMenuOpen(open => !open)}
            title="Switch practice"
            className="nodrag nopan mb-1.5 flex w-full items-center justify-center gap-1.5 truncate rounded-md bg-purple-600 px-2 py-1 text-[11px] font-bold text-white transition-colors hover:bg-purple-700 cursor-pointer"
          >
            <span className="truncate">{activePractice.name}</span>
          </button>
        )}
        <p className="text-[10px] text-slate-500 leading-snug pl-0.5">
          {subtitle}
        </p>

        {hasSwitcher && menuOpen && (
          <div className="nodrag nopan absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-xl text-xs font-medium">
            <div className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">Practice</div>
            {practices!.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onSelectPractice!(p.id);
                }}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                  p.id === practiceId ? 'bg-purple-50 text-purple-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{p.name}</span>
                {p.id === practiceId && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            ))}
            {canCreatePractice && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onCreatePractice?.();
                }}
                className="mt-1 flex w-full items-center gap-1.5 rounded-lg border-t border-slate-100 px-2.5 py-1.5 text-left text-purple-700 hover:bg-purple-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                New practice
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
