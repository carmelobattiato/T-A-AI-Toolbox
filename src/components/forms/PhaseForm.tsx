import React, { useState } from 'react';
import { IconPicker } from './IconPicker.tsx';
import { IconKey } from '../../utils/iconKeys.ts';
import { Phase } from '../../types/index.ts';
import { X, Layers, Plus, Trash2 } from 'lucide-react';

interface PhaseFormProps {
  initialData?: Phase | null;
  targetIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (phaseData: Partial<Phase> & { targetIndex?: number }) => Promise<void>;
}

export const PhaseForm: React.FC<PhaseFormProps> = ({
  initialData,
  targetIndex,
  isOpen,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(initialData?.title || '');
  const [icon, setIcon] = useState<IconKey | null>((initialData?.icon as IconKey | undefined) || null);
  const [description, setDescription] = useState(initialData?.description || '');
  const [activities, setActivities] = useState<string[]>(
    initialData?.activities || ['Initial activity']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addActivity = () => {
    setActivities(prev => [...prev, '']);
  };

  const updateActivity = (index: number, val: string) => {
    setActivities(prev => prev.map((act, i) => (i === index ? val : act)));
  };

  const removeActivity = (index: number) => {
    setActivities(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('The phase title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        icon,
        title: title.trim(),
        description: description.trim(),
        activities: activities.map(a => a.trim()).filter(Boolean),
        targetIndex: typeof targetIndex === 'number' ? targetIndex : undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error saving the phase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2 text-indigo-700">
            <Layers className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900">
              {initialData ? 'Edit Phase' : `New Phase (Position ${targetIndex ?? 'at end'})`}
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
              Phase name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Customer Discovery, Security Hardening..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          <IconPicker value={icon} onChange={setIcon} />

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Purpose and description of the phase
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the goal of this phase in the practice flow..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
            />
          </div>

          {/* Main activities */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">
                Main activities
              </label>
              <button
                type="button"
                onClick={addActivity}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add activity</span>
              </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {activities.map((act, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={act}
                    onChange={e => updateActivity(idx, e.target.value)}
                    placeholder={`Activity #${idx + 1}`}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Remove activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
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
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Insert Phase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
