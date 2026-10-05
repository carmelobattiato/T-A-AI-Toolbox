import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Phase } from '../../types/index.ts';
import { getPhaseIcon, PHASE_COLORS } from '../../utils/icons.tsx';
import { Plus, Wrench, Sparkles, MessageSquare } from 'lucide-react';

interface PhaseNodeData {
  phase: Phase;
  isSelected: boolean;
  isDimmed: boolean;
  toolsCount: number;
  ideasCount: number;
  needsCount: number;
  onSelect: (phaseId: string) => void;
  onAddTool: (phaseId: string) => void;
  onAddIdea: (phaseId: string) => void;
  onAddNeed: (phaseId: string) => void;
}

export const PhaseNode: React.FC<{ data: PhaseNodeData }> = ({ data }) => {
  const {
    phase,
    isSelected,
    isDimmed,
    toolsCount,
    ideasCount,
    needsCount,
    onSelect,
    onAddTool,
    onAddIdea,
    onAddNeed
  } = data;

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const colorTheme = PHASE_COLORS[phase.position % PHASE_COLORS.length] || PHASE_COLORS[1];

  // Dimensions of the chevron
  const width = 210;
  const height = 94;
  const indent = 22;

  // Path for chevron polygon
  // M 0,0 L 188,0 L 210,47 L 188,94 L 0,94 L 22,47 Z
  const svgPath = `M 0,0 L ${width - indent},0 L ${width},${height / 2} L ${width - indent},${height} L 0,${height} L ${indent},${height / 2} Z`;

  return (
    <div
      className={`relative select-none transition-all duration-300 ${
        isDimmed ? 'opacity-25' : 'opacity-100'
      }`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* Top Handle for Tool/Idea edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-blue-400 !border-white !top-[-4px]"
      />

      {/* Top Add Button (+) with vertical stem */}
      <div className="absolute top-[-28px] left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTopMenuOpen(!topMenuOpen);
            }}
            title="Aggiungi Tool o Idea per questa fase"
            className="w-5 h-5 rounded-full bg-white border border-blue-300 shadow-sm hover:border-blue-500 hover:scale-110 transition-all flex items-center justify-center text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Dropdown Menu */}
          {topMenuOpen && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-lg shadow-xl border border-slate-200 py-1 px-1 flex flex-col gap-1 w-32 z-50 text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  onAddTool(phase.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-blue-50 text-blue-700 transition-colors text-left"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Aggiungi Tool</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  onAddIdea(phase.id);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded hover:bg-purple-50 text-purple-700 transition-colors text-left"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Aggiungi Idea</span>
              </button>
            </div>
          )}
        </div>
        {/* Subtle vertical connector stem */}
        <div className="w-[1.5px] h-2 bg-blue-300" />
      </div>

      {/* Main Chevron Shape (Clickable) */}
      <div
        onClick={() => onSelect(phase.id)}
        className="w-full h-full cursor-pointer relative group"
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 transition-transform duration-200 group-hover:scale-[1.01]"
        >
          <defs>
            <linearGradient id={`grad-${phase.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isSelected ? '#EFF6FF' : colorTheme.bg} />
              <stop offset="100%" stopColor={isSelected ? '#DBEAFE' : '#FFFFFF'} />
            </linearGradient>
            {isSelected && (
              <filter id={`glow-${phase.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#2563EB" floodOpacity="0.3" />
              </filter>
            )}
          </defs>

          <path
            d={svgPath}
            fill={`url(#grad-${phase.id})`}
            stroke={isSelected ? '#2563EB' : colorTheme.border}
            strokeWidth={isSelected ? '2.5' : '1.5'}
            filter={isSelected ? `url(#glow-${phase.id})` : undefined}
            className="transition-all duration-300"
          />
        </svg>

        {/* Content overlaid inside chevron */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center pl-6 pr-4 py-2 pointer-events-none">
          {/* Phase Number Badge */}
          <div
            className={`absolute top-2 left-7 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white/90 border border-slate-300 text-slate-700'
            }`}
          >
            {phase.position}
          </div>

          {/* Phase Icon */}
          <div className="mb-1 transition-transform duration-200 group-hover:scale-110">
            {getPhaseIcon(phase.position, phase.title)}
          </div>

          {/* Phase Name */}
          <div
            className={`text-center font-semibold text-xs leading-tight line-clamp-2 px-1 ${
              isSelected ? 'text-blue-900 font-bold' : 'text-slate-800'
            }`}
          >
            {phase.title}
          </div>

          {/* Item counts indicator (if any) */}
          {(toolsCount > 0 || ideasCount > 0 || needsCount > 0) && (
            <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-500 font-medium">
              {toolsCount > 0 && <span className="text-blue-600">{toolsCount}T</span>}
              {ideasCount > 0 && <span className="text-purple-600">{ideasCount}I</span>}
              {needsCount > 0 && <span className="text-emerald-600">{needsCount}E</span>}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Add Button (+) for Esigenze with stem */}
      <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
        <div className="w-[1.5px] h-2 bg-emerald-300" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddNeed(phase.id);
          }}
          title="Aggiungi Esigenza per questa fase"
          className="w-5 h-5 rounded-full bg-white border border-emerald-300 shadow-sm hover:border-emerald-500 hover:scale-110 transition-all flex items-center justify-center text-emerald-600 hover:bg-emerald-50"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Handle for Need edges */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-emerald-400 !border-white !bottom-[-4px]"
      />
    </div>
  );
};
