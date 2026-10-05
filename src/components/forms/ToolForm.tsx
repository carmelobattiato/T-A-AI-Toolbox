import React, { useState } from 'react';
import { Item, Phase } from '../../types/index.ts';
import { X, Wrench, Check } from 'lucide-react';

interface ToolFormProps {
  initialData?: Item | null;
  defaultPhaseId?: string;
  phases: Phase[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (toolData: Partial<Item>) => Promise<void>;
}

export const ToolForm: React.FC<ToolFormProps> = ({
  initialData,
  defaultPhaseId,
  phases,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>(
    initialData?.phaseIds || (defaultPhaseId ? [defaultPhaseId] : ['phase-1'])
  );
  const [owner, setOwner] = useState(initialData?.owner || 'Carmelo Battiato');
  const [generalizationRequired, setGeneralizationRequired] = useState(
    initialData?.generalizationRequired ?? false
  );
  const [githubUrl, setGithubUrl] = useState(initialData?.githubUrl || '');
  const [catalogUrl, setCatalogUrl] = useState(initialData?.catalogUrl || '');
  const [demoUrl, setDemoUrl] = useState(initialData?.demoUrl || '');
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
      alert('Il titolo del Tool è obbligatorio');
      return;
    }
    if (selectedPhaseIds.length === 0) {
      alert('Seleziona almeno una fase coperta dal Tool');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'TOOL',
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        phaseIds: selectedPhaseIds,
        owner: owner.trim(),
        generalizationRequired,
        githubUrl: githubUrl.trim() || undefined,
        catalogUrl: catalogUrl.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Errore nel salvataggio del Tool');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-2 text-blue-700">
            <Wrench className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">
              {initialData ? 'Modifica Tool' : 'Aggiungi Nuovo Tool'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Titolo */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nome del Tool <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="es. Document AI, Draw.io AI Assistant..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Sintesi Breve */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descrizione breve / Sintesi (1-2 righe)
            </label>
            <input
              type="text"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Sintesi delle capability e del valore architetturale..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Descrizione Completa */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descrizione completa
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Dettagli sul funzionamento, modelli usati o integrazioni..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs resize-none"
            />
          </div>

          {/* Fasi Coperte - Multi-select */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Fasi coperte dal Tool (molti-a-molti) <span className="text-red-500">*</span>
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
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        checked ? 'border-white bg-blue-700' : 'border-slate-300 bg-white'
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

          {/* Owner e Generalizzazione */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner / POC</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="es. Carmelo Battiato"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-amber-200 bg-amber-50/70 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={generalizationRequired}
                  onChange={e => setGeneralizationRequired(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="font-semibold text-amber-900 text-[11px]">
                  Richiede generalizzazione
                </span>
              </label>
            </div>
          </div>

          {/* URLs */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-700 block">Link e Repository</span>
            <input
              type="url"
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              placeholder="GitHub URL (https://github.com/...)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
            <input
              type="url"
              value={catalogUrl}
              onChange={e => setCatalogUrl(e.target.value)}
              placeholder="Catalog URL (https://garage.accenture.com/...)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
            <input
              type="url"
              value={demoUrl}
              onChange={e => setDemoUrl(e.target.value)}
              placeholder="Demo URL (https://demo...)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Note operative</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Note, dipendenze o vincoli..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : initialData ? 'Salva Modifiche' : 'Aggiungi Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
