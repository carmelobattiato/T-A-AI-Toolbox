import React from 'react';
import { Wrench, ChevronsRight, Target, Sparkles } from 'lucide-react';

export type CategoryType = 'TOOL_IDEA' | 'PHASE' | 'NEED';

interface CategoryLabelData {
  category: CategoryType;
  title: string;
  subtitle: string;
  countLabel?: string;
}

export const CategoryLabelNode: React.FC<{ data: CategoryLabelData }> = ({ data }) => {
  const { category, title, subtitle, countLabel } = data;

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
    <div className="relative select-none pointer-events-none">
      {/* Visual dashed anchor line pointing to the graph items */}
      <div
        className={`absolute left-full top-1/2 -translate-y-1/2 w-10 border-t-2 border-dashed ${config.lineColor} opacity-70`}
      />

      {/* Main card */}
      <div
        className={`w-[210px] bg-white/95 backdrop-blur-md px-3.5 py-3 rounded-xl border border-slate-200/90 border-l-[5px] ${config.borderAccent} shadow-md transition-all duration-300`}
        style={{
          boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg border ${config.bgIcon} shrink-0`}>
              {config.icon}
            </div>
            <div className="font-extrabold text-[11px] text-slate-800 tracking-wider uppercase">
              {title}
            </div>
          </div>
          {countLabel && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${config.badgeBg}`}
            >
              {countLabel}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 leading-snug pl-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
