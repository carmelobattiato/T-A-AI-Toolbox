import React from 'react';
import { Link2, RefreshCw, Unlink } from 'lucide-react';
import { Item } from '../../types/index.ts';

interface PortalSectionProps {
  // Tool or WiP (needs are not linked to the portal)
  item: Item;
  readOnly: boolean;
  busy: boolean;
  onLink: () => void;
  onSync: () => void;
  onUnlink: () => void;
}

const ACTION_CLASS =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-default';

// Link of a Tool or WiP to a portal solution: the details the portal gave (read-only) and the actions on the link
export const PortalSection: React.FC<PortalSectionProps> = ({ item, readOnly, busy, onLink, onSync, onUnlink }) => {
  const linked = Boolean(item.portalProjectId);
  const syncedAt = item.portalSyncedAt ? new Date(item.portalSyncedAt).toLocaleString() : null;

  return (
    <div>
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Portal</h4>
      {linked ? (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          {item.portalInfo && (
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{item.portalInfo}</p>
          )}
          {syncedAt && <p className="text-[10px] text-slate-400">Last update from the portal: {syncedAt}</p>}
          {!readOnly && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button type="button" onClick={onSync} disabled={busy} className={ACTION_CLASS}>
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                Update from portal
              </button>
              <button type="button" onClick={onLink} disabled={busy} className={ACTION_CLASS}>
                <Link2 className="w-3.5 h-3.5" />
                Change solution
              </button>
              <button type="button" onClick={onUnlink} disabled={busy} className={ACTION_CLASS}>
                <Unlink className="w-3.5 h-3.5" />
                Unlink
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <p className="text-xs text-slate-600">Not linked to a portal solution.</p>
          {!readOnly && (
            <button type="button" onClick={onLink} disabled={busy} className={ACTION_CLASS}>
              <Link2 className="w-3.5 h-3.5" />
              Link to a portal solution
            </button>
          )}
        </div>
      )}
    </div>
  );
};
