import React, { useState } from 'react';
import { Phase, Item } from '../../types/index.ts';
import { getPhaseIcon, getItemIcon } from '../../utils/icons.tsx';
import { X, Plus, Wrench, Sparkles, MessageSquare, ChevronRight, Edit3, Trash2 } from 'lucide-react';

interface PhaseDrawerProps {
  phase: Phase;
  items: Item[];
  onClose: () => void;
  onSelectItem: (item: Item) => void;
  onAddTool: (phaseId: string) => void;
  onAddIdea: (phaseId: string) => void;
  onAddNeed: (phaseId: string) => void;
  onEditPhase: (phase: Phase) => void;
  onDeletePhase: (phaseId: string) => void;
}

export const PhaseDrawer: React.FC<PhaseDrawerProps> = ({
  phase,
  items,
  onClose,
  onSelectItem,
  onAddTool,
  onAddIdea,
  onAddNeed,
  onEditPhase,
  onDeletePhase,
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'ideas' | 'needs'>('tools');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const phaseTools = items.filter(i => i.type === 'TOOL' && i.phaseIds.includes(phase.id));
  const phaseIdeas = items.filter(i => i.type === 'IDEA' && i.phaseIds.includes(phase.id));
  const phaseNeeds = items.filter(i => i.type === 'NEED' && i.phaseIds.includes(phase.id));

  return (
    <div className="w-[360px] md:w-[380px] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-250">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {phase.position}
          </div>
          <span className="font-bold text-slate-900 text-sm truncate max-w-[230px]">
            {phase.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditPhase(phase)}
            title="Modifica fase"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Chiudi drawer"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Phase Info Hero */}
        <div className="flex items-start gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/60">
          <div className="p-2.5 bg-white rounded-lg shadow-2xs text-blue-600">
            {getPhaseIcon(phase.position, phase.title)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm">{phase.title}</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {phase.description || 'Nessuna descrizione per questa fase.'}
            </p>
          </div>
        </div>

        {/* Attività Principali */}
        {phase.activities && phase.activities.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Attività principali
            </h4>
            <ul className="space-y-1.5">
              {phase.activities.map((act, idx) => (
                <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-1 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('tools')}
              className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'tools'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Tool ({phaseTools.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ideas')}
              className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'ideas'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              WiP ({phaseIdeas.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('needs')}
              className={`flex-1 pb-2 text-xs font-semibold text-center border-b-2 transition-all ${
                activeTab === 'needs'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Esigenze ({phaseNeeds.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-2">
          {activeTab === 'tools' && (
            <div className="space-y-2">
              {phaseTools.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Nessun Tool mappato per questa fase.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Rappresenta un potenziale gap di automazione!
                  </p>
                </div>
              ) : (
                phaseTools.map((tool) => (
                  <div
                    key={tool.id}
                    onClick={() => onSelectItem(tool)}
                    className="p-3 bg-white rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 mt-0.5">
                      {getItemIcon('TOOL', tool.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {tool.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {tool.summary || tool.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {tool.generalizationRequired && (
                          <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Da generalizzare
                          </span>
                        )}
                        {tool.phaseIds.length > 1 && (
                          <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                            Copre {tool.phaseIds.length} fasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => onAddTool(phase.id)}
                className="w-full mt-3 py-2 px-3 border border-dashed border-blue-300 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi Tool</span>
              </button>
            </div>
          )}

          {activeTab === 'ideas' && (
            <div className="space-y-2">
              {phaseIdeas.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Nessun WiP per questa fase.
                  </p>
                </div>
              ) : (
                phaseIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    onClick={() => onSelectItem(idea)}
                    className="p-3 bg-white rounded-lg border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer group flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 mt-0.5">
                      {getItemIcon('IDEA', idea.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-purple-600 transition-colors truncate">
                          {idea.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {idea.problem || idea.summary}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          WiP
                        </span>
                        {idea.phaseIds.length > 1 && (
                          <span className="text-[8.5px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {idea.phaseIds.length} fasi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => onAddIdea(phase.id)}
                className="w-full mt-3 py-2 px-3 border border-dashed border-purple-300 rounded-lg text-xs font-semibold text-purple-600 hover:bg-purple-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi WiP</span>
              </button>
            </div>
          )}

          {activeTab === 'needs' && (
            <div className="space-y-2">
              {phaseNeeds.length === 0 ? (
                <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    Nessuna Esigenza registrata per questa fase.
                  </p>
                </div>
              ) : (
                phaseNeeds.map((need) => (
                  <div
                    key={need.id}
                    onClick={() => onSelectItem(need)}
                    className="p-3 bg-white rounded-lg border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all cursor-pointer group flex items-start gap-2.5"
                  >
                    <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-600 mt-0.5">
                      {getItemIcon('NEED', need.title)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                          {need.title}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {need.description || need.summary}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => onAddNeed(phase.id)}
                className="w-full mt-3 py-2 px-3 border border-dashed border-emerald-300 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Aggiungi Esigenza</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer info & delete button */}
      {!phase.isCore && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Fase personalizzata</span>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-red-700">Eliminare?</span>
              <button
                type="button"
                onClick={() => {
                  onDeletePhase(phase.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Sì, elimina
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Elimina fase</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
