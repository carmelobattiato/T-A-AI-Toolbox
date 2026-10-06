import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Item, Phase } from '../../types/index.ts';
import { getItemIcon } from '../../utils/icons.tsx';
import { getOwnerInitials } from '../../utils/owner.ts';

interface NeedNodeData {
  item: Item;
  phases: Phase[];
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (item: Item) => void;
  onHover?: (item: Item | null) => void;
}

export const NeedNode: React.FC<{ data: NeedNodeData }> = ({ data }) => {
  const { item, phases, isSelected, isDimmed, onSelect, onHover } = data;
  const [isHovered, setIsHovered] = useState(false);

  const coveredPhases = phases.filter(p => item.phaseIds.includes(p.id));

  return (
    <div
      className={`relative select-none transition-all duration-300 ${
        isDimmed ? 'opacity-15' : 'opacity-100'
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        if (onHover) onHover(item);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onHover) onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item);
      }}
    >
      {/* Top Handle to receive connection from Phase bottom handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-emerald-500 !border-white !top-0"
      />

      {/* Sphere Container */}
      <div
        className={`w-[118px] h-[118px] rounded-full cursor-pointer flex flex-col items-center justify-center p-2 text-center relative transition-all duration-200 ${
          isSelected
            ? 'bg-emerald-50/95 border-2 border-emerald-600 shadow-xl ring-4 ring-emerald-100 scale-105'
            : 'bg-white/95 border-2 border-emerald-400 hover:border-emerald-600 shadow-md hover:shadow-lg hover:scale-102'
        }`}
        style={{
          background: isSelected
            ? 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #ECFDF5 100%)'
            : 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F0FDF4 100%)',
        }}
      >
        {/* Need Icon */}
        <div className="mb-1 transition-transform duration-200 group-hover:scale-110">
          {getItemIcon('NEED', item.title)}
        </div>

        {/* Title (2-3 lines centered) */}
        <div className="text-[11px] font-medium text-slate-800 leading-tight line-clamp-3 px-1 max-w-[95px]">
          {item.title}
        </div>

        {/* Owner Avatar / Badge (same as ToolNode) */}
        <div className="absolute bottom-1 right-2 flex items-center">
          <div
            title={`Owner: ${item.owner || 'Team T&A'}`}
            className="w-4 h-4 rounded-full bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center border border-white shadow-xs"
          >
            {getOwnerInitials(item.owner)}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-emerald-400 !border-white !opacity-0"
      />

      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-900/95 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl pointer-events-none z-50 whitespace-nowrap border border-slate-700">
          <div className="font-semibold text-emerald-300">{item.title}</div>
          <div className="text-[10px] text-slate-400">Esigenza operativa</div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            Fasi correlate: {coveredPhases.map(p => p.title).join(', ') || 'Nessuna fase'}
          </div>
          {item.desiredOutcome && (
            <div className="text-[10px] text-slate-400 max-w-[200px] truncate">
              {item.desiredOutcome}
            </div>
          )}
          {item.owner && (
            <div className="text-[10px] text-slate-400">Owner: {item.owner}</div>
          )}
        </div>
      )}
    </div>
  );
};
