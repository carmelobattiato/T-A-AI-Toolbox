import React, { useEffect } from 'react';
import { FilePlus, LayoutGrid, X } from 'lucide-react';
import { ItemType } from '../../types/index.ts';

interface NewItemChoiceProps {
  // Kind being created (Tool or WiP); nothing is shown when null
  kind: Exclude<ItemType, 'NEED'> | null;
  onClose: () => void;
  onNewApplication: () => void;
  onPortalCatalog: () => void;
}

const KIND_LABEL: Record<Exclude<ItemType, 'NEED'>, string> = {
  TOOL: 'Tool',
  IDEA: 'WiP',
};

// Asked first when a Tool or WiP is added: start from an empty form or from a solution of the portal catalog
export const NewItemChoice: React.FC<NewItemChoiceProps> = ({ kind, onClose, onNewApplication, onPortalCatalog }) => {
  useEffect(() => {
    if (!kind) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [kind, onClose]);

  if (!kind) return null;
  const label = KIND_LABEL[kind];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-label={`Add a ${label}`}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <h3 className="font-bold text-base text-slate-900">Add a {label}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onNewApplication}
            className="group text-left rounded-xl border border-slate-200 p-5 hover:border-purple-400 hover:shadow-md transition cursor-pointer"
          >
            <FilePlus className="w-7 h-7 text-purple-600 mb-3" />
            <div className="font-bold text-sm text-slate-900">New application</div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Start from an empty form and fill in every field yourself.
            </p>
          </button>

          <button
            type="button"
            onClick={onPortalCatalog}
            className="group text-left rounded-xl border border-slate-200 p-5 hover:border-purple-400 hover:shadow-md transition cursor-pointer"
          >
            <LayoutGrid className="w-7 h-7 text-purple-600 mb-3" />
            <div className="font-bold text-sm text-slate-900">Portal Catalog</div>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Pick a solution already published on the portal: the form opens pre-filled with its data.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
