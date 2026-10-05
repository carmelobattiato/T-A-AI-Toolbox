import React from 'react';
import { Plus } from 'lucide-react';

interface AddPhaseNodeData {
  targetIndex: number;
  onAddPhase: (targetIndex: number) => void;
  isDimmed: boolean;
}

export const AddPhaseNode: React.FC<{ data: AddPhaseNodeData }> = ({ data }) => {
  const { targetIndex, onAddPhase, isDimmed } = data;

  return (
    <div
      className={`select-none flex items-center justify-center transition-all duration-300 ${
        isDimmed ? 'opacity-20' : 'opacity-100'
      }`}
      style={{ width: '32px', height: '32px' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddPhase(targetIndex);
        }}
        title={`Inserisci nuova fase alla posizione ${targetIndex}`}
        className="w-7 h-7 rounded-full bg-white border border-slate-300 shadow-sm hover:border-indigo-500 hover:bg-indigo-50 hover:scale-115 transition-all flex items-center justify-center text-slate-500 hover:text-indigo-600 group"
      >
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
      </button>
    </div>
  );
};
