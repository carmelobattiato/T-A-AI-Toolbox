import React, { useEffect, useState } from 'react';
import { X, Star, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.tsx';
import { Practice } from '../../types/index.ts';
import { PracticePicker } from '../practices/PracticePicker.tsx';

interface DefaultPracticeModalProps {
  isOpen: boolean;
  practices: Practice[];
  // The user's current default practice, null if not chosen yet
  currentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

// Any signed-in user picks the practice that opens at sign-in
export const DefaultPracticeModal: React.FC<DefaultPracticeModalProps> = ({ isOpen, practices, currentId, onClose, onSaved }) => {
  const { setDefaultPractice } = useAuth();
  const [chosen, setChosen] = useState<string | null>(currentId);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Start from the saved value each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setChosen(currentId);
      setError('');
    }
  }, [isOpen, currentId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    setBusy(true);
    setError('');
    try {
      await setDefaultPractice(chosen);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Could not save the default practice');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Default practice</h3>
              <p className="text-xs text-slate-500">The practice that opens when you sign in</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 text-slate-800">
          {practices.length === 0 ? (
            <p className="text-xs text-slate-500">No practice available.</p>
          ) : (
            <PracticePicker practices={practices} value={chosen} onChange={setChosen} listClassName="max-h-[50vh]" />
          )}
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !chosen || chosen === currentId}
            className="w-full px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
