import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Item, Phase } from '../../types/index.ts';
import { getItemIcon } from '../../utils/icons.tsx';

interface ToolNodeData {
  item: Item;
  phases: Phase[];
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (item: Item) => void;
  onHover?: (item: Item | null) => void;
}

export const ToolNode: React.FC<{ data: ToolNodeData }> = ({ data }) => {
  const { item, phases, isSelected, isDimmed, onSelect, onHover } = data;
  const [isHovered, setIsHovered] = useState(false);

  const coveredPhases = phases.filter(p => item.phaseIds.includes(p.id));
  const ownerInitials = item.owner
    ? item.owner.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CB';

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
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-blue-400 !border-white !opacity-0"
      />

      {/* Sphere Container */}
      <div
        className={`w-[124px] h-[124px] rounded-full cursor-pointer flex flex-col items-center justify-center p-2.5 text-center relative transition-all duration-200 ${
          isSelected
            ? 'bg-blue-50/95 border-2 border-blue-600 shadow-xl ring-4 ring-blue-100 scale-105'
            : 'bg-white/95 border-2 border-blue-400 hover:border-blue-500 shadow-md hover:shadow-lg hover:scale-102'
        }`}
        style={{
          background: isSelected
            ? 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #EFF6FF 100%)'
            : 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F8FAFC 100%)',
        }}
      >
        {/* Tool Icon */}
        <div className="mb-1 transition-transform duration-200 group-hover:scale-110">
          {getItemIcon('TOOL', item.title)}
        </div>

        {/* Title */}
        <div className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2 max-w-[95px]">
          {item.title}
        </div>

        {/* Da generalizzare Badge */}
        {item.generalizationRequired && (
          <span className="mt-1 text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shadow-2xs">
            Da generalizzare
          </span>
        )}

        {/* Owner Avatar / Badge */}
        <div className="absolute bottom-1 right-2 flex items-center">
          <div
            title={`Owner: ${item.owner || 'Carmelo Battiato'}`}
            className="w-4 h-4 rounded-full bg-slate-800 text-white text-[8px] font-bold flex items-center justify-center border border-white shadow-xs"
          >
            {ownerInitials}
          </div>
          {item.phaseIds.length > 1 && (
            <span
              title={`Copre ${item.phaseIds.length} fasi`}
              className="ml-0.5 text-[8px] font-bold text-blue-600 bg-blue-50 rounded-full px-1 border border-blue-200"
            >
              +{item.phaseIds.length}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-blue-500 !border-white !bottom-0"
      />

      {/* Hover Tooltip (Spec 58, 59) */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl pointer-events-none z-50 whitespace-nowrap border border-slate-700">
          <div className="font-semibold text-blue-300">{item.title}</div>
          <div className="text-[10px] text-slate-400">Tool</div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            Copre: {coveredPhases.map(p => p.title).join(', ') || 'Nessuna fase'}
          </div>
          {item.owner && (
            <div className="text-[10px] text-slate-400">Owner: {item.owner}</div>
          )}
        </div>
      )}
    </div>
  );
};
