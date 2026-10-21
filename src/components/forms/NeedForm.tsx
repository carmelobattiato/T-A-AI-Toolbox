import React, { useState } from 'react';
import { IconPicker } from './IconPicker.tsx';
import { IconKey } from '../../utils/iconKeys.ts';
import { formatList, parseList } from '../../utils/lists.ts';
import { Item, Phase } from '../../types/index.ts';
import { X, MessageSquare, Check } from 'lucide-react';

interface NeedFormProps {
  initialData?: Item | null;
  defaultPhaseId?: string;
  // Owner pre-filled for new elements (the logged-in user, else the practice team)
  defaultOwner?: string;
  phases: Phase[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (needData: Partial<Item>) => Promise<void>;
}

export const NeedForm: React.FC<NeedFormProps> = ({
  initialData,
  defaultPhaseId,
  defaultOwner = 'Team T&A',
  phases,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || '');
  const [icon, setIcon] = useState<IconKey | null>((initialData?.icon as IconKey | undefined) || null);
  const [description, setDescription] = useState(initialData?.description || '');
  const [currentProcess, setCurrentProcess] = useState(initialData?.currentProcess || '');
  const [desiredTool, setDesiredTool] = useState(initialData?.desiredTool || '');
  const [desiredOutcome, setDesiredOutcome] = useState(initialData?.desiredOutcome || '');
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>(
    initialData?.phaseIds || (defaultPhaseId ? [defaultPhaseId] : phases[0] ? [phases[0].id] : [])
  );
  const [owner, setOwner] = useState(initialData?.owner || defaultOwner);
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
      alert('The Need title is required');
      return;
    }
    if (!description.trim()) {
      alert('Describe the operational need');
      return;
    }
    if (selectedPhaseIds.length === 0) {
      alert('Select at least one related phase');
      return;
    }
    const priorityValue = priority.trim() === '' ? null : Number(priority);
    if (priorityValue !== null && (!Number.isInteger(priorityValue) || priorityValue < 1)) {
      alert('Priority must be a whole number, 1 or higher');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        icon,
        type: 'NEED',
        title: title.trim(),
        description: description.trim(),
        currentProcess: currentProcess.trim() || undefined,
        desiredTool: desiredTool.trim() || undefined,
        desiredOutcome: desiredOutcome.trim() || undefined,
        phaseIds: selectedPhaseIds,
        owner: owner.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: parseList(tags),
        customers: parseList(customers),
        priority: priorityValue,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving the Need');
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
              {initialData ? 'Edit Need' : 'Record New Need'}
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
              Need title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Automatic application inventory, Automate Terraform..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <IconPicker value={icon} onChange={setIcon} />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Description of the operational need <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the team's need and which activities it slows down or complicates..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs resize-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              How it is handled today (AS-IS process)
            </label>
            <input
              type="text"
              value={currentProcess}
              onChange={e => setCurrentProcess(e.target.value)}
              placeholder="e.g. Manual filling of Excel files and interviews..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Envisioned tool or agent
            </label>
            <input
              type="text"
              value={desiredTool}
              onChange={e => setDesiredTool(e.target.value)}
              placeholder="e.g. An agent that generates the Terraform modules starting from the Target Design..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Desired outcome
            </label>
            <input
              type="text"
              value={desiredOutcome}
              onChange={e => setDesiredOutcome(e.target.value)}
              placeholder="e.g. Time reduced from 2 weeks to 2 days with an audit trail..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
            />
          </div>

          {/* Fasi Correlate */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Phases related to the need <span className="text-red-500">*</span>
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

          <div className="grid grid-cols-[1fr_1fr_7rem] gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tags (separated by ;)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. aws; terraform"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customers (separated by ;)</label>
              <input
                type="text"
                value={customers}
                onChange={e => setCustomers(e.target.value)}
                placeholder="e.g. Customer A; Customer B"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1" title="1 = highest priority">Priority</label>
              <input
                type="number"
                min={1}
                step={1}
                value={priority}
                onChange={e => setPriority(e.target.value)}
                placeholder="1 = high"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Owner / Contact</label>
              <input
                type="text"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                placeholder="e.g. Team Cloud / Contact"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operating notes</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Notes on the need..."
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Record Need'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
