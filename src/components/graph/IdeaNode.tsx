import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Item, Phase } from '../../types/index.ts';
import { getItemIcon } from '../../utils/icons.tsx';

interface IdeaNodeData {
  item: Item;
  phases: Phase[];
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: (item: Item) => void;
  onHover?: (item: Item | null) => void;
}

export const IdeaNode: React.FC<{ data: IdeaNodeData }> = ({ data }) => {
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
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!w-2 !h-2 !bg-purple-400 !border-white !opacity-0"
      />

      {/* Sphere Container */}
      <div
        className={`w-[120px] h-[120px] rounded-full cursor-pointer flex flex-col items-center justify-center p-2.5 text-center relative transition-all duration-200 ${
          isSelected
            ? 'bg-purple-50/95 border-2 border-dashed border-purple-600 shadow-xl ring-4 ring-purple-100 scale-105'
            : 'bg-white/95 border-2 border-dashed border-purple-400 hover:border-purple-600 shadow-md hover:shadow-lg hover:scale-102'
        }`}
        style={{
          background: isSelected
            ? 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #FAF5FF 100%)'
            : 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #FAF5FF 100%)',
        }}
      >
        {/* Idea Icon */}
        <div className="mb-1 transition-transform duration-200 group-hover:scale-110">
          {getItemIcon('IDEA', item.title)}
        </div>

        {/* Title */}
        <div className="text-[11px] font-semibold text-slate-800 leading-tight line-clamp-2 max-w-[92px]">
          {item.title}
        </div>

        {/* Badge Idea */}
        <span className="mt-1 text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
          Idea
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!w-2 !h-2 !bg-purple-500 !border-white !bottom-0"
      />

      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900/95 text-white text-xs rounded-lg py-1.5 px-2.5 shadow-xl pointer-events-none z-50 whitespace-nowrap border border-slate-700">
          <div className="font-semibold text-purple-300">{item.title}</div>
          <div className="text-[10px] text-slate-400">Idea in valutazione</div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            Interessa: {coveredPhases.map(p => p.title).join(', ') || 'Nessuna fase'}
          </div>
          {item.expectedBenefit && (
            <div className="text-[10px] text-slate-400 max-w-[200px] truncate">
              {item.expectedBenefit}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
