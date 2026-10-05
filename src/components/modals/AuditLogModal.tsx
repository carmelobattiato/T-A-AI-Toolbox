import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types/index.ts';
import { X, History, RefreshCw } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-base">Audit Trail & Registro Operazioni</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              title="Aggiorna log"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 text-xs">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Caricamento registro eventi...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Nessun evento registrato.</div>
          ) : (
            logs.map(log => {
              const actionColor =
                log.action === 'CREATE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : log.action === 'UPDATE'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-red-50 text-red-700 border-red-200';

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${actionColor}`}>
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {log.entityType}: {log.entityId}
                      </span>
                    </div>
                    {log.payload && (
                      <p className="text-[11px] text-slate-600 mt-1 font-mono">
                        {typeof log.payload === 'object'
                          ? log.payload.title || JSON.stringify(log.payload).slice(0, 100)
                          : String(log.payload)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-500 font-medium block">{log.user}</span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString()} · {new Date(log.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
