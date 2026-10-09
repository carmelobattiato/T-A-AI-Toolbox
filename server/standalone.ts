import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { db } from './store.ts';
import { settingsStore } from './settingsStore.ts';
import { handleAssistantChat } from './assistant.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.DATA_DIR || './data';

// Increase payload limit for base64 screenshots and documents (up to 15MB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Full CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-forwarded-user'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Helper to get general user or SSO header
function getUser(req: Request): string {
  const forwarded = req.headers['x-forwarded-user'] as string;
  if (forwarded && forwarded.trim()) return forwarded.trim();
  return 'Team T&A';
}

// Healthcheck endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ta-toolbox-backend',
    dataDir: DATA_DIR,
    timestamp: new Date().toISOString(),
  });
});

// 1. Phases
app.get('/api/phases', (_req: Request, res: Response) => {
  try {
    const phases = db.getPhases();
    res.json(phases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/phases', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const newPhase = db.createPhase(req.body, user);
    res.status(201).json(newPhase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/phases/:id', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const updated = db.updatePhase(req.params.id, req.body, user);
    if (!updated) {
      res.status(404).json({ error: 'Fase non trovata' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/phases/:id', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const success = db.deletePhase(req.params.id, user);
    if (!success) {
      res.status(400).json({ error: 'Impossibile eliminare una fase core o fase non trovata' });
      return;
    }
    res.json({ success: true, message: 'Fase eliminata' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Items (Tool, Idea, Need)
app.get('/api/items', (req: Request, res: Response) => {
  try {
    const { type, phaseId, search } = req.query;
    const items = db.getItems({
      type: type as string,
      phaseId: phaseId as string,
      search: search as string,
    });
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', (req: Request, res: Response) => {
  try {
    const item = db.getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: 'Elemento non trovato' });
      return;
    }
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const newItem = db.createItem(req.body, user);
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/items/:id', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const updated = db.updateItem(req.params.id, req.body, user);
    if (!updated) {
      res.status(404).json({ error: 'Elemento non trovato' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/items/:id', (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const success = db.deleteItem(req.params.id, user);
    if (!success) {
      res.status(404).json({ error: 'Elemento non trovato' });
      return;
    }
    res.json({ success: true, message: 'Elemento eliminato' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Attachments
app.post('/api/items/:id/attachments', (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, data } = req.body;
    if (!fileName || !mimeType || !data) {
      res.status(400).json({ error: 'Campi fileName, mimeType e data sono obbligatori' });
      return;
    }
    const attachment = db.addAttachment(req.params.id, { fileName, mimeType, data });
    res.status(201).json(attachment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/attachments/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteAttachment(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Allegato non trovato' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Audit Log
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  try {
    res.json(db.getAuditLogs());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Chatbot Assistant
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, confirmedAction, cancelAction } = req.body;
    if (!message && !confirmedAction && !cancelAction) {
      res.status(400).json({ error: 'Messaggio o azione richiesta mancante' });
      return;
    }
    const user = getUser(req);
    const result = await handleAssistantChat(
      message || '',
      user,
      confirmedAction,
      Boolean(cancelAction)
    );
    res.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Errore interno assistente' });
  }
});

// 6. Custom OpenAI & AI Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    res.json(settingsStore.getClientSettings());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const { provider, geminiBaseUrl, geminiModel, geminiApiKey, openaiBaseUrl, openaiModel, openaiApiKey } = req.body;
    const updates: any = {};
    if (provider) updates.provider = provider;
    if (typeof geminiBaseUrl === 'string') updates.geminiBaseUrl = geminiBaseUrl;
    if (typeof geminiModel === 'string') updates.geminiModel = geminiModel;
    if (typeof geminiApiKey === 'string' && geminiApiKey !== '••••••••••••••••') {
      updates.geminiApiKey = geminiApiKey;
    }
    if (typeof openaiBaseUrl === 'string') updates.openaiBaseUrl = openaiBaseUrl;
    if (typeof openaiModel === 'string') updates.openaiModel = openaiModel;
    if (typeof openaiApiKey === 'string' && openaiApiKey !== '••••••••••••••••') {
      updates.openaiApiKey = openaiApiKey;
    }

    settingsStore.save(updates);
    res.json(settingsStore.getClientSettings());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/settings/test', async (req: Request, res: Response) => {
  try {
    const result = req.body.provider === 'gemini'
      ? await settingsStore.testGemini(req.body)
      : await settingsStore.testOpenAi(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Standalone Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`T&A AI Toolbox - Standalone Backend API`);
  console.log(`Port: ${PORT}`);
  console.log(`Data Directory: ${DATA_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`=========================================`);
});
