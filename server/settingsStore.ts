import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { AISettings } from '../src/types/index.ts';

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
    fs.writeFileSync(tmpFile, JSON.stringify(this.settings, null, 2), 'utf-8');
    fs.renameSync(tmpFile, SETTINGS_FILE);
    return this.settings;
  }

  public getSettings(): AISettings {
    return { ...this.settings };
  }

  public getGeminiApiKey(): string {
    return this.settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
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

  public async testGemini(settingsToTest?: Partial<AISettings>): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const s = { ...this.settings, ...settingsToTest };
    const apiKey = s.geminiApiKey || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      return { success: false, message: 'API Key mancante' };
    }

    const startTime = Date.now();
    try {
      const ai = createGeminiClient(apiKey, s.geminiBaseUrl);
      await ai.models.generateContent({
        model: s.geminiModel,
        contents: 'Ping',
        config: { maxOutputTokens: 5 },
      });
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        message: `Connessione riuscita! Modello "${s.geminiModel}" pronto (${latencyMs}ms).`,
        latencyMs,
      };
    } catch (err: any) {
      return { success: false, message: `Errore endpoint: ${String(err.message || err).substring(0, 200)}` };
    }
  }

  public async testOpenAi(settingsToTest?: Partial<AISettings>): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const s = { ...this.settings, ...settingsToTest };
    const startTime = Date.now();

    if (!s.openaiBaseUrl) {
      return { success: false, message: 'URL Base mancante (es. https://api.openai.com/v1)' };
    }
    if (!s.openaiApiKey) {
      return { success: false, message: 'API Key mancante' };
    }

    // Clean URL
    let baseUrl = s.openaiBaseUrl.trim().replace(/\/+$/, '');
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl;
    }

    try {
      // Test either /chat/completions or /models
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${s.openaiApiKey.trim()}`,
        },
        body: JSON.stringify({
          model: s.openaiModel || 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return {
          success: true,
          message: `Connessione riuscita! Modello "${s.openaiModel || 'default'}" pronto (${latencyMs}ms).`,
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
