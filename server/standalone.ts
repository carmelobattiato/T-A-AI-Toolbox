import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { db } from './store.ts';
import { settingsStore } from './settingsStore.ts';
import { corsMiddleware } from './cors.ts';
import { getUser, internalError } from './http.ts';
import { handleAssistantChat } from './assistant.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = process.env.DATA_DIR || './data';

// Increase payload limit for base64 screenshots and documents (up to 15MB)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use(corsMiddleware);


// Healthcheck endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ta-toolbox-backend',
    timestamp: new Date().toISOString(),
  });
});

// 1. Phases
app.get('/api/phases', (_req: Request, res: Response) => {
  try {
    const phases = db.getPhases();
    res.json(phases);
  } catch (err: any) {
    internalError(res, err);
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
    internalError(res, err);
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
    internalError(res, err);
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
    internalError(res, err);
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

app.get('/api/dashboard/tiles', (_req: Request, res: Response) => {
  try {
    res.json(db.getDashboardTiles());
  } catch (err: any) {
    internalError(res, err);
  }
});

app.delete('/api/dashboard/tiles/:slot', (req: Request, res: Response) => {
  try {
    if (!db.deleteDashboardTile(Number(req.params.slot))) {
      res.status(404).json({ error: 'Tile non trovato' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    internalError(res, err);
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
    internalError(res, err);
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
    internalError(res, err);
  }
});

// 4. Audit Log
app.get('/api/audit-logs', (_req: Request, res: Response) => {
  try {
    res.json(db.getAuditLogs());
  } catch (err: any) {
    internalError(res, err);
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
    internalError(res, err, 'Errore interno assistente');
  }
});

// 6. Custom OpenAI & AI Settings
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    res.json(settingsStore.getClientSettings());
  } catch (err: any) {
    internalError(res, err);
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    settingsStore.updateFromRequest(req.body);
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
    console.error(err);
    res.status(500).json({ success: false, message: 'Errore interno del server' });
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
