import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';

// Address of the portal: it serves the catalog of solutions and the links to its pages.
// The default is the Accenture GenAI portal; an admin can point the tool to another address.
export const PortalPanel: React.FC = () => {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    fetch('/api/portal/config')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'The portal address could not be loaded');
        setUrl(data.url);
        setSaved(data.url);
        setDefaultUrl(data.defaultUrl);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  // Empty value saves the default address
  const save = async (value: string) => {
    setBusy(true);
    setError('');
    setDone('');
    try {
      const res = await fetch('/api/portal/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The portal address could not be saved');
      setUrl(data.url);
      setSaved(data.url);
      setDone('Portal address saved.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The portal address could not be saved');
    } finally {
      setBusy(false);
    }
  };

  const changed = url.trim() !== saved;
  const isDefault = saved === defaultUrl;

  return (
    <div className="p-6 space-y-5 text-xs">
      <div>
        <h3 className="font-bold text-sm text-slate-900">Portal address</h3>
        <p className="mt-1 text-slate-500 leading-relaxed">
          The portal that serves the <strong>Portal Catalog</strong> (the solutions you can start a Tool or WiP from) and
          the links to its pages. Users sign in through the portal, so the address must be the one they use.
        </p>
      </div>

      <div>
        <label htmlFor="portal-url" className="block font-semibold text-slate-700 mb-1">
          URL
        </label>
        <input
          id="portal-url"
          type="url"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setDone('');
          }}
          placeholder={defaultUrl}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-purple-400 focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          {isDefault ? 'Default address.' : `Default: ${defaultUrl}`} Use https://; http:// is accepted for localhost only.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => save(url)}
          disabled={!changed || busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50 cursor-pointer disabled:cursor-default"
        >
          <Save className="w-3.5 h-3.5" />
          Save
        </button>
        <button
          type="button"
          onClick={() => save('')}
          disabled={busy || isDefault}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restore default
        </button>
      </div>

      {error && <p className="text-red-600 font-semibold">{error}</p>}
      {done && <p className="text-emerald-700 font-semibold">{done}</p>}
    </div>
  );
};
