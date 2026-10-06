import React, { useState } from 'react';
import { Item, Phase } from '../../types/index.ts';
import { X, MessageSquare, Check } from 'lucide-react';

interface NeedFormProps {
  initialData?: Item | null;
  defaultPhaseId?: string;
  phases: Phase[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (needData: Partial<Item>) => Promise<void>;
}

export const NeedForm: React.FC<NeedFormProps> = ({
  initialData,
  defaultPhaseId,
  phases,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [currentProcess, setCurrentProcess] = useState(initialData?.currentProcess || '');
  const [desiredTool, setDesiredTool] = useState(initialData?.desiredTool || '');
  const [desiredOutcome, setDesiredOutcome] = useState(initialData?.desiredOutcome || '');
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>(
    initialData?.phaseIds || (defaultPhaseId ? [defaultPhaseId] : ['phase-1'])
  );
  const [owner, setOwner] = useState(initialData?.owner || 'Team T&A');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePhase = (phaseId: string) => {
    setSelectedPhaseIds(prev =>
      prev.includes(phaseId) ? prev.filter(id => id !== phaseId) : [...prev, phaseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Il titolo dell\'esigenza è obbligatorio');
      return;
    }
    if (!description.trim()) {
      alert('Descrivi il bisogno operativo');
      return;
    }
    if (selectedPhaseIds.length === 0) {
      alert('Seleziona almeno una fase correlata');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'NEED',
        title: title.trim(),
        description: description.trim(),
        currentProcess: currentProcess.trim() || undefined,
        desiredTool: desiredTool.trim() || undefined,
        desiredOutcome: desiredOutcome.trim() || undefined,
        phaseIds: selectedPhaseIds,
        owner: owner.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Errore nel salvataggio dell\'esigenza');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-700">
            <MessageSquare className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">
              {initialData ? 'Modifica Esigenza' : 'Registra Nuova Esigenza'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Titolo dell'Esigenza <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="es. Inventario automatico applicazioni, Automatizzare Terraform..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descrizione del bisogno operativo <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrivi l'esigenza del team e quali attività rallenta o complica..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Come viene gestita oggi (processo AS-IS)
            </label>
            <input
              type="text"
              value={currentProcess}
              onChange={e => setCurrentProcess(e.target.value)}
              placeholder="es. Compilazione manuale file Excel e interviste..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tool o agente immaginato
            </label>
            <input
              type="text"
              value={desiredTool}
              onChange={e => setDesiredTool(e.target.value)}
              placeholder="es. Agente che partendo dal Target Design generi i moduli Terraform..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Risultato desiderato (Outcome)
            </label>
            <input
              type="text"
              value={desiredOutcome}
              onChange={e => setDesiredOutcome(e.target.value)}
              placeholder="es. Riduzione tempi da 2 settimane a 2 giorni con audit trail..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Fasi Correlate */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Fasi correlate al bisogno <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
              {phases.map(ph => {
                const checked = selectedPhaseIds.includes(ph.id);
                return (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => togglePhase(ph.id)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all ${
                      checked
                        ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        checked ? 'border-white bg-emerald-700' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="truncate text-[11px]">{ph.position}. {ph.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner / Referente</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="es. Team T&A / Referente"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Note operative</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Note o priorità del bisogno..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : initialData ? 'Salva Modifiche' : 'Registra Esigenza'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
