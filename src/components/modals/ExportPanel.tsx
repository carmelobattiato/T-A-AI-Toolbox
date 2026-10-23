import React, { useState } from 'react';
import { Download, RefreshCw, AlertTriangle } from 'lucide-react';

export const ExportPanel: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const res = await fetch('/api/admin/export');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Export failed');
      }
      // The server names the file ADMPB_DATA_yyyymmdd.zip
      const match = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '');
      const fileName = match?.[1] ?? 'ADMPB_DATA.zip';
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setDone(fileName);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <p className="text-xs text-slate-500">
        Downloads a zip with every JSON file of the data folder, whole and as stored: map data, change log, users and settings.
        The file is named <span className="font-mono font-semibold text-slate-700">ADMPB_DATA_yyyymmdd.zip</span>.
      </p>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          The archive contains password hashes and AI API keys. Keep it private and do not share or commit it.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={download}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
        >
          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download data
        </button>
        {done && <span className="text-xs font-semibold text-emerald-600">Downloaded {done}</span>}
        {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
      </div>
    </div>
  );
};
