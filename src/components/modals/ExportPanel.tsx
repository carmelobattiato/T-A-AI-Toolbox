import React, { useRef, useState } from 'react';
import { Download, RefreshCw, AlertTriangle, Upload } from 'lucide-react';

export const ExportPanel: React.FC = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // Import
  const fileInput = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importDone, setImportDone] = useState('');

  const upload = async () => {
    setImporting(true);
    setImportError('');
    setImportDone('');
    try {
      const files = await Promise.all(chosen.map(async f => ({ name: f.name, content: await f.text() })));
      const send = (overwrite: string[]) =>
        fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ files, overwrite }),
        });

      let res = await send([]);
      if (res.status === 409) {
        const data = await res.json();
        const list = (data.existing as string[]).map(n => `  • ${n}`).join('\n');
        // A copy of each replaced file is kept in the data folder
        if (!window.confirm(`These files already exist in the data folder and will be replaced:\n\n${list}\n\nReplace them?`)) {
          setImportError('Import cancelled: nothing was changed.');
          return;
        }
        res = await send(data.existing);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportDone(`Imported: ${(data.written as string[]).join(', ')}. The page will reload.`);
      setChosen([]);
      if (fileInput.current) fileInput.current.value = '';
      // The data on screen (and possibly the session) changed: start from a clean reload
      setTimeout(() => window.location.reload(), 1800);
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

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
        Download a zip with every JSON file of the data folder, whole and as stored: map data, change log, users and settings.
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

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <h4 className="text-xs font-bold text-slate-800">Import JSON files</h4>
        <p className="text-xs text-slate-500">
          Upload one or more <span className="font-mono">.json</span> files into the data folder (for example the ones from an export).
          If a file already exists you are asked to confirm the replacement; a copy of the replaced file is kept.
          <span className="font-mono"> db.json</span> and <span className="font-mono">users.json</span> are checked first:
          an import that would leave no active admin is refused.
        </p>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          multiple
          onChange={e => {
            setChosen(Array.from(e.target.files ?? []));
            setImportError('');
            setImportDone('');
          }}
          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />

        {chosen.length > 0 && (
          <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
            {chosen.map(f => (
              <li key={f.name} className="flex justify-between px-3 py-1.5">
                <span className="font-mono text-slate-700">{f.name}</span>
                <span className="text-slate-400">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={upload}
            disabled={importing || chosen.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
          >
            {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload to data folder
          </button>
          {importDone && <span className="text-xs font-semibold text-emerald-600">{importDone}</span>}
          {importError && <span className="text-xs font-semibold text-red-600">{importError}</span>}
        </div>
      </div>
    </div>
  );
};
