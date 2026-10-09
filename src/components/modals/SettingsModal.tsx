import React, { useState, useEffect } from 'react';
import { AISettings } from '../../types/index.ts';

type Provider = 'gemini' | 'openai';

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  hasKey: boolean;
}

const MASKED_KEY = '••••••••••••••••';

const EMPTY_CONFIG: Record<Provider, ProviderConfig> = {
  gemini: { baseUrl: '', model: 'gemini-3.8-flash', apiKey: '', hasKey: false },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '', hasKey: false },
};
import {
  X,
  Settings,
  Sparkles,
  Bot,
  Key,
  Globe,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [configs, setConfigs] = useState<Record<Provider, ProviderConfig>>(EMPTY_CONFIG);
  const [showApiKey, setShowApiKey] = useState(false);

  const current = configs[provider];
  const patchCurrent = (patch: Partial<ProviderConfig>) =>
    setConfigs(prev => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));

  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load current settings from backend
  useEffect(() => {
    if (!isOpen) return;
    setTestResult(null);
    setSaveSuccess(false);

    fetch('/api/settings')
      .then(res => res.json())
      .then((data: AISettings & { hasApiKey?: boolean; hasGeminiApiKey?: boolean }) => {
        if (data.provider) setProvider(data.provider);
        setConfigs({
          gemini: {
            baseUrl: data.geminiBaseUrl ?? '',
            model: data.geminiModel || EMPTY_CONFIG.gemini.model,
            apiKey: data.hasGeminiApiKey ? MASKED_KEY : '',
            hasKey: Boolean(data.hasGeminiApiKey),
          },
          openai: {
            baseUrl: data.openaiBaseUrl || EMPTY_CONFIG.openai.baseUrl,
            model: data.openaiModel || EMPTY_CONFIG.openai.model,
            apiKey: data.hasApiKey ? MASKED_KEY : '',
            hasKey: Boolean(data.hasApiKey),
          },
        });
      })
      .catch(err => console.error('Failed to load settings:', err));
  }, [isOpen]);

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          geminiBaseUrl: configs.gemini.baseUrl,
          geminiModel: configs.gemini.model,
          geminiApiKey: configs.gemini.apiKey === MASKED_KEY ? undefined : configs.gemini.apiKey,
          openaiBaseUrl: configs.openai.baseUrl,
          openaiModel: configs.openai.model,
          openaiApiKey: configs.openai.apiKey === MASKED_KEY ? undefined : configs.openai.apiKey,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Errore di connessione durante il test',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: Partial<AISettings> = {
        provider,
        geminiBaseUrl: configs.gemini.baseUrl.trim(),
        geminiModel: configs.gemini.model.trim(),
        openaiBaseUrl: configs.openai.baseUrl.trim(),
        openaiModel: configs.openai.model.trim(),
      };

      if (configs.gemini.apiKey && configs.gemini.apiKey !== MASKED_KEY) {
        payload.geminiApiKey = configs.gemini.apiKey.trim();
      }
      if (configs.openai.apiKey && configs.openai.apiKey !== MASKED_KEY) {
        payload.openaiApiKey = configs.openai.apiKey.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Errore durante il salvataggio');

      setSaveSuccess(true);
      if (onSaved) onSaved();

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Errore durante il salvataggio');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Configurazione Motore AI
              </h3>
              <p className="text-xs text-slate-500">
                Seleziona il provider per il T&A Assistant (Gemini o OpenAI compatibile)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Provider Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Provider Principale
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Gemini Option */}
              <div
                onClick={() => setProvider('gemini')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  provider === 'gemini'
                    ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    provider === 'gemini'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>Google Gemini</span>
                    <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                      Default
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Modello gemini-3.8-flash integrato nativamente in AI Studio.
                  </p>
                </div>
              </div>

              {/* Custom OpenAI Option */}
              <div
                onClick={() => setProvider('openai')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  provider === 'openai'
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    provider === 'openai'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>OpenAI Custom</span>
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                      Custom
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    API OpenAI o compatibile (vLLM, Ollama, router aziendale).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Configuration Fields (editable for the selected provider) */}
          <div className="space-y-3.5 p-4 rounded-xl border bg-slate-50/70 border-blue-200 shadow-2xs transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                {provider === 'gemini' ? 'Parametri API Google Gemini' : 'Parametri API OpenAI / Compatibile'}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {provider === 'gemini' ? 'Endpoint Google predefinito se vuoto' : 'Supporta standard v1/chat/completions'}
              </span>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                URL Endpoint Base
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={current.baseUrl}
                  onChange={e => patchCurrent({ baseUrl: e.target.value })}
                  placeholder={provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : 'https://api.openai.com/v1'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {provider === 'gemini' ? (
                  <>Esempio proxy: <code className="text-slate-600">https://proxy-corp.internal</code></>
                ) : (
                  <>
                    Esempi: <code className="text-slate-600">https://api.openai.com/v1</code>,{' '}
                    <code className="text-slate-600">http://localhost:11434/v1</code>,{' '}
                    <code className="text-slate-600">https://proxy-corp.internal/v1</code>
                  </>
                )}
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nome Modello
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={current.model}
                  onChange={e => patchCurrent({ model: e.target.value })}
                  placeholder={provider === 'gemini' ? 'gemini-3.8-flash' : 'gpt-4o-mini'}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-slate-800"
                />
              </div>
              {provider === 'openai' && (
                <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto text-[10px]">
                  <span className="text-slate-400">Suggeriti:</span>
                  {['gpt-4o-mini', 'gpt-4o', 'qwen2.5:72b', 'llama3.3'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => patchCurrent({ model: m })}
                      className="px-2 py-0.5 rounded bg-slate-200/60 hover:bg-slate-200 text-slate-700 font-mono transition-colors cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Key */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>API Key</span>
                {current.hasKey && (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    ✓ Chiave memorizzata
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={current.apiKey}
                  onChange={e => patchCurrent({ apiKey: e.target.value })}
                  placeholder={current.hasKey ? '•••••••••••••••• (lascia invariato per non modificare)' : provider === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="w-full pl-3 pr-10 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showApiKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {provider === 'gemini'
                  ? 'Se vuota viene usata la variabile GEMINI_API_KEY del server.'
                  : 'Per endpoint locali senza auth (es. Ollama), puoi inserire una stringa qualsiasi (es. "ollama").'}
              </p>
            </div>

            {/* Test Connection Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || (!current.apiKey && !current.hasKey)}
                className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>{isTesting ? 'Verifica in corso...' : 'Testa Connessione'}</span>
              </button>
            </div>

            {/* Test Result Feedback */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {testResult.success ? 'Connessione stabilita!' : 'Test fallito'}
                  </div>
                  <div className="text-[11px] mt-0.5 leading-snug">
                    {testResult.message}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Configurazione salvata!
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : null}
                <span>Salva configurazione</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
