import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { AISettings } from '../src/types/index.ts';
import { normalizeBaseUrl } from '../src/utils/url.ts';

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), 'data');
const SETTINGS_FILE = path.resolve(DATA_DIR, 'settings.json');

const DEFAULT_SETTINGS: AISettings = {
  provider: 'gemini',
  geminiBaseUrl: '',
  geminiModel: 'gemini-3.8-flash',
  geminiApiKey: '',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiModel: 'gpt-4o-mini',
  openaiApiKey: '',
};

const MASK = '••••••••••••••••';
const KEY_MISSING = "API Key mancante. Se hai cambiato l'URL, reinseriscila: la chiave salvata vale solo per l'endpoint salvato.";

type Provider = 'gemini' | 'openai';
type TestResult = { success: boolean; message: string; latencyMs?: number };

function allowedHosts(): string[] {
  return (process.env.ALLOWED_LLM_HOSTS ?? '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
}

// Returns an error message when the endpoint must not be used, otherwise null
export function checkEndpoint(rawUrl: string | undefined): string | null {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  if (hasScheme && !/^https?:\/\//i.test(trimmed)) return 'URL non valido: usare http o https';
  let url: URL;
  try {
    url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  } catch {
    return 'URL non valido';
  }
  const hosts = allowedHosts();
  if (hosts.length > 0 && !hosts.includes(url.hostname.toLowerCase())) {
    return `Host non consentito (ALLOWED_LLM_HOSTS): ${url.hostname}`;
  }
  return null;
}

function envKeyAllowedFor(baseUrl: string | undefined): boolean {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return true;
  return allowedHosts().length > 0 && checkEndpoint(normalized) === null;
}

export function createGeminiClient(apiKey: string, baseUrl?: string): GoogleGenAI {
  const cleanBaseUrl = baseUrl?.trim().replace(/\/+$/, '');
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { 'User-Agent': 'aistudio-build' },
      ...(cleanBaseUrl ? { baseUrl: cleanBaseUrl } : {}),
    },
  });
}

class SettingsStore {
  private settings: AISettings;

  constructor() {
    this.settings = this.load();
  }

  private ensureDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load(): AISettings {
    this.ensureDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      this.save(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }
    try {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (err) {
      console.error('Failed to load settings.json, using defaults:', err);
      return { ...DEFAULT_SETTINGS };
    }
  }

  public save(newSettings: Partial<AISettings>): AISettings {
    this.ensureDir();
    this.settings = { ...this.settings, ...newSettings };
    // Atomic write: a crash mid-write must never leave a truncated settings.json
    const tmpFile = `${SETTINGS_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.settings, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.renameSync(tmpFile, SETTINGS_FILE);
    return this.settings;
  }

  public getSettings(): AISettings {
    return { ...this.settings };
  }

  // The server-side environment key is only sent to Google's default endpoint or to an allow-listed host
  public getGeminiApiKey(): string {
    if (this.settings.geminiApiKey) return this.settings.geminiApiKey;
    return envKeyAllowedFor(this.settings.geminiBaseUrl) ? process.env.GEMINI_API_KEY || '' : '';
  }

  // A stored key is only used for the endpoint it was saved with; a different endpoint needs a new key
  private resolveKey(provider: Provider, baseUrl: string, bodyKey: unknown): string {
    if (typeof bodyKey === 'string' && bodyKey.trim() && bodyKey !== MASK) return bodyKey.trim();
    const baseField = `${provider}BaseUrl` as 'geminiBaseUrl' | 'openaiBaseUrl';
    const keyField = `${provider}ApiKey` as 'geminiApiKey' | 'openaiApiKey';
    const sameEndpoint = normalizeBaseUrl(baseUrl) === normalizeBaseUrl(this.settings[baseField]);
    const stored = sameEndpoint ? this.settings[keyField] : '';
    if (stored) return stored;
    if (provider === 'gemini' && envKeyAllowedFor(baseUrl)) return process.env.GEMINI_API_KEY || '';
    return '';
  }

  public updateFromRequest(body: any): AISettings {
    const updates: Partial<AISettings> = {};
    if (body?.provider === 'gemini' || body?.provider === 'openai') updates.provider = body.provider;

    for (const provider of ['gemini', 'openai'] as const) {
      const baseField = `${provider}BaseUrl` as 'geminiBaseUrl' | 'openaiBaseUrl';
      const modelField = `${provider}Model` as 'geminiModel' | 'openaiModel';
      const keyField = `${provider}ApiKey` as 'geminiApiKey' | 'openaiApiKey';

      if (typeof body?.[baseField] === 'string') {
        const url = body[baseField].trim();
        const error = checkEndpoint(url);
        if (error) throw new Error(error);
        updates[baseField] = url;
      }
      if (typeof body?.[modelField] === 'string') updates[modelField] = body[modelField].trim();

      const newKey = typeof body?.[keyField] === 'string' && body[keyField] !== MASK ? body[keyField].trim() : '';
      if (newKey) {
        updates[keyField] = newKey;
      } else if (
        updates[baseField] !== undefined &&
        normalizeBaseUrl(updates[baseField]) !== normalizeBaseUrl(this.settings[baseField])
      ) {
        updates[keyField] = '';
      }
    }
    return this.save(updates);
  }

  public getClientSettings(): AISettings & { hasApiKey: boolean; hasGeminiApiKey: boolean } {
    return {
      provider: this.settings.provider,
      geminiBaseUrl: this.settings.geminiBaseUrl,
      geminiModel: this.settings.geminiModel,
      geminiApiKey: this.settings.geminiApiKey ? '••••••••••••••••' : '',
      hasGeminiApiKey: this.getGeminiApiKey().length > 3,
      openaiBaseUrl: this.settings.openaiBaseUrl,
      openaiModel: this.settings.openaiModel,
      openaiApiKey: this.settings.openaiApiKey ? '••••••••••••••••' : '',
      hasApiKey: Boolean(this.settings.openaiApiKey && this.settings.openaiApiKey.length > 3),
      isConfigured: Boolean(this.settings.provider === 'openai' && this.settings.openaiApiKey),
    };
  }

  public async testGemini(body: any): Promise<TestResult> {
    const baseUrl = typeof body?.geminiBaseUrl === 'string' ? body.geminiBaseUrl : this.settings.geminiBaseUrl;
    const model = typeof body?.geminiModel === 'string' && body.geminiModel.trim()
      ? body.geminiModel.trim()
      : this.settings.geminiModel;

    const endpointError = checkEndpoint(baseUrl);
    if (endpointError) return { success: false, message: endpointError };
    const apiKey = this.resolveKey('gemini', baseUrl, body?.geminiApiKey);
    if (!apiKey) return { success: false, message: KEY_MISSING };

    const startTime = Date.now();
    try {
      const ai = createGeminiClient(apiKey, baseUrl);
      await ai.models.generateContent({
        model,
        contents: 'Ping',
        config: { maxOutputTokens: 5 },
      });
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: `Connessione riuscita! Modello "${model}" pronto (${latencyMs}ms).`,
        latencyMs,
      };
    } catch (err: any) {
      return { success: false, message: `Errore endpoint: ${String(err.message || err).substring(0, 200)}` };
    }
  }

  public async testOpenAi(body: any): Promise<TestResult> {
    const baseUrlRaw: string = typeof body?.openaiBaseUrl === 'string' ? body.openaiBaseUrl : this.settings.openaiBaseUrl;
    const model = typeof body?.openaiModel === 'string' && body.openaiModel.trim()
      ? body.openaiModel.trim()
      : this.settings.openaiModel || 'gpt-4o-mini';
    const startTime = Date.now();

    if (!baseUrlRaw.trim()) {
      return { success: false, message: 'URL Base mancante (es. https://api.openai.com/v1)' };
    }
    const endpointError = checkEndpoint(baseUrlRaw);
    if (endpointError) return { success: false, message: endpointError };
    const apiKey = this.resolveKey('openai', baseUrlRaw, body?.openaiApiKey);
    if (!apiKey) return { success: false, message: KEY_MISSING };

    const baseUrl = normalizeBaseUrl(baseUrlRaw);

    try {
      // Test either /chat/completions or /models
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          success: true,
          message: `Connessione riuscita! Modello "${model}" pronto (${latencyMs}ms).`,
          latencyMs,
        };
      }

      const errorText = await res.text();
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const json = JSON.parse(errorText);
        if (json.error?.message) errorMsg = json.error.message;
      } catch {
        if (errorText.length < 120) errorMsg = errorText;
      }

      return { success: false, message: `Errore endpoint: ${errorMsg}` };
    } catch (err: any) {
      return { success: false, message: `Errore di rete/connessione: ${err.message || 'Verifica URL e certificato'}` };
    }
  }
}

export const settingsStore = new SettingsStore();
