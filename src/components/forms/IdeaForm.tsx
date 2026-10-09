import React, { useState } from 'react';
import { formatList, parseList } from '../../utils/lists.ts';
import { Item, Phase } from '../../types/index.ts';
import { X, Sparkles, Check } from 'lucide-react';

interface IdeaFormProps {
  initialData?: Item | null;
  defaultPhaseId?: string;
  phases: Phase[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ideaData: Partial<Item>) => Promise<void>;
}

export const IdeaForm: React.FC<IdeaFormProps> = ({
  initialData,
  defaultPhaseId,
  phases,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || '');
  const [problem, setProblem] = useState(initialData?.problem || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [requirements, setRequirements] = useState(initialData?.requirements || '');
  const [expectedBenefit, setExpectedBenefit] = useState(initialData?.expectedBenefit || '');
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>(
    initialData?.phaseIds || (defaultPhaseId ? [defaultPhaseId] : ['phase-3'])
  );
  const [owner, setOwner] = useState(initialData?.owner || 'Team T&A');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [tags, setTags] = useState(formatList(initialData?.tags));
  const [customers, setCustomers] = useState(formatList(initialData?.customers));
  const [priority, setPriority] = useState(initialData?.priority != null ? String(initialData.priority) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const togglePhase = (phaseId: string) => {
    setSelectedPhaseIds(prev =>
      prev.includes(phaseId) ? prev.filter(id => id !== phaseId) : [...prev, phaseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Il titolo del WiP è obbligatorio');
      return;
    }
    if (!problem.trim()) {
      alert('Descrivi il problema che il WiP affronta');
      return;
    }
    if (selectedPhaseIds.length === 0) {
      alert('Seleziona almeno una fase');
      return;
    }
    const priorityValue = priority.trim() === '' ? null : Number(priority);
    if (priorityValue !== null && (!Number.isInteger(priorityValue) || priorityValue < 1)) {
      alert('La priorità deve essere un numero intero da 1 in su');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        type: 'IDEA',
        title: title.trim(),
        problem: problem.trim(),
        description: description.trim() || undefined,
        requirements: requirements.trim() || undefined,
        expectedBenefit: expectedBenefit.trim() || undefined,
        phaseIds: selectedPhaseIds,
        owner: owner.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: parseList(tags),
        customers: parseList(customers),
        priority: priorityValue,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Errore nel salvataggio del WiP');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
          <div className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">
              {initialData ? 'Modifica WiP' : 'Aggiungi Nuovo WiP'}
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
              Titolo del WiP <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="es. Terraform / IaC Agent, Kubernetes MCP..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Problema da risolvere <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={problem}
              onChange={e => setProblem(e.target.value)}
              placeholder="Quale gap o inefficienza si vuole colmare?"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Requisiti tecnici e funzionali
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={e => setRequirements(e.target.value)}
              placeholder="Integrazioni richieste, modelli, MCP, vincoli..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Beneficio atteso
            </label>
            <input
              type="text"
              value={expectedBenefit}
              onChange={e => setExpectedBenefit(e.target.value)}
              placeholder="es. Risparmio del 60% dei tempi di bootstrapping..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
            />
          </div>

          {/* Fasi Interessate */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Fasi interessate <span className="text-red-500">*</span>
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
                        ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                        checked ? 'border-white bg-purple-700' : 'border-slate-300 bg-white'
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

          <div className="grid grid-cols-[1fr_1fr_7rem] gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tag (separati da ;)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="es. aws; terraform"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clienti (separati da ;)</label>
              <input
                type="text"
                value={customers}
                onChange={e => setCustomers(e.target.value)}
                placeholder="es. Cliente A; Cliente B"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1" title="1 = priorità più alta">Priorità</label>
              <input
                type="number"
                min={1}
                step={1}
                value={priority}
                onChange={e => setPriority(e.target.value)}
                placeholder="1 = alta"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Proponente / Autore</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="es. Team T&A / Proponente"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Note</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Note varie..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
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
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : initialData ? 'Salva Modifiche' : 'Crea WiP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
