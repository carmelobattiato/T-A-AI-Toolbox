import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { db } from './server/store.ts';
import { handleAssistantChat } from './server/assistant.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Increase payload limit for base64 screenshots/attachments (up to 10MB)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Helper to get authenticated user from SSO header or fallback
function getUser(req: Request): string {
  const forwarded = req.headers['x-forwarded-user'] as string;
  if (forwarded && forwarded.trim()) return forwarded.trim();
  return 'Carmelo Battiato';
}

// --- API ROUTES ---

// 1. Phases
app.get('/api/phases', (req: Request, res: Response) => {
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
      res.status(404).json({ error: 'Fase non trovata' });
      return;
    }
    res.json({ success: true, message: 'Fase eliminata' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Items (Tools, Ideas, Needs)
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
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Il campo message è obbligatorio' });
      return;
    }
    const user = getUser(req);
    const result = await handleAssistantChat(message, user);
    res.json(result);
  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Errore interno assistente' });
  }
});

// --- VITE MIDDLEWARE OR STATIC SERVING ---
async function startServer() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
