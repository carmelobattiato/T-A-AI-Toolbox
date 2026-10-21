import React, { useState } from 'react';
import { X, KeyRound, RefreshCw } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.tsx';

interface ChangePasswordModalProps {
  isOpen: boolean;
  // A temporary password must be replaced before anything else: the modal cannot be dismissed
  forced: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, forced, onClose, onChanged }) => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setError('The two new passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onChanged();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Password change failed');
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Change password</h3>
              <p className="text-xs text-slate-500">
                {forced ? 'The current password is temporary: choose a new one' : 'Minimum 8 characters'}
              </p>
            </div>
          </div>
          {!forced && (
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-6 space-y-4">
          <label className="block text-xs font-semibold text-slate-700">
            Current password
            <input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            New password
            <input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Repeat new password
            <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} />
          </label>
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !current || !next || !confirm}
            className="w-full px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Save new password
          </button>
        </div>
      </form>
    </div>
  );
};
