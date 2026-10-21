import { Express, Request, Response } from 'express';
import { DEFAULT_PRACTICE_ID } from '../src/types/index.ts';
import { db } from './store.ts';
import { settingsStore } from './settingsStore.ts';
import { userStore } from './userStore.ts';
import { handleAssistantChat } from './assistant.ts';
import { authorizeCreate, authorizeEdit, registerAuthRoutes, requireAdmin, sendError } from './auth.ts';
import { getUser, internalError } from './http.ts';

// Practice selected by a read request; older clients send nothing and get the default map
function practiceFromQuery(req: Request, res: Response): string | null {
  const raw = req.query.practice;
  const practiceId = typeof raw === 'string' && raw ? raw : DEFAULT_PRACTICE_ID;
  if (!db.getPractice(practiceId)) {
    res.status(404).json({ error: 'Practice not found' });
    return null;
  }
  return practiceId;
}

// Registers every /api route shared by the dev server and the standalone backend
export function registerApiRoutes(app: Express) {
  registerAuthRoutes(app);

  // --- Practices ---
  app.get('/api/practices', (_req: Request, res: Response) => {
    try {
      res.json(db.getPractices());
    } catch (err) {
      internalError(res, err);
    }
  });

  app.post('/api/practices', requireAdmin, (req: Request, res: Response) => {
    try {
      res.status(201).json(db.createPractice(req.body?.name, getUser(req)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/practices/:id', requireAdmin, (req: Request, res: Response) => {
    try {
      const practice = db.renamePractice(req.params.id, req.body?.name, getUser(req));
      if (!practice) {
        res.status(404).json({ error: 'Practice not found' });
        return;
      }
      res.json(practice);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/practices/:id', requireAdmin, (req: Request, res: Response) => {
    try {
      if (!db.deletePractice(req.params.id, getUser(req))) {
        res.status(404).json({ error: 'Practice not found' });
        return;
      }
      userStore.removePractice(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Users (admin only) ---
  app.get('/api/users', requireAdmin, (_req: Request, res: Response) => {
    try {
      res.json(userStore.listUsers());
    } catch (err) {
      internalError(res, err);
    }
  });

  const practiceIds = () => db.getPractices().map(p => p.id);

  app.post('/api/users', requireAdmin, (req: Request, res: Response) => {
    try {
      const user = userStore.createUser(req.body ?? {}, practiceIds());
      db.addAuditLog(getUser(req), 'CREATE', 'USER', user.id, { username: user.username, role: user.role, practices: user.practices });
      res.status(201).json(user);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/users/:id', requireAdmin, (req: Request, res: Response) => {
    try {
      const user = userStore.updateUser(req.params.id, req.body ?? {}, practiceIds());
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      db.addAuditLog(getUser(req), 'UPDATE', 'USER', user.id, { username: user.username, role: user.role, practices: user.practices, active: user.active });
      res.json(user);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.delete('/api/users/:id', requireAdmin, (req: Request, res: Response) => {
    try {
      const target = userStore.getUser(req.params.id);
      if (!userStore.deleteUser(req.params.id, req.user!.id)) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      db.addAuditLog(getUser(req), 'DELETE', 'USER', req.params.id, { username: target?.username });
      res.json({ success: true });
    } catch (err) {
      sendError(res, err);
    }
  });

  // --- Phases ---
  app.get('/api/phases', (req: Request, res: Response) => {
    try {
      const practiceId = practiceFromQuery(req, res);
      if (practiceId) res.json(db.getPhases(practiceId));
    } catch (err) {
      internalError(res, err);
    }
  });

  app.post('/api/phases', (req: Request, res: Response) => {
    try {
      const practiceId = typeof req.body?.practiceId === 'string' ? req.body.practiceId : '';
      if (!authorizeEdit(req, res, practiceId)) return;
      res.status(201).json(db.createPhase(req.body, getUser(req)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/phases/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getPhasePractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Phase not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      res.json(db.updatePhase(req.params.id, req.body, getUser(req)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/phases/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getPhasePractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Phase not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      db.deletePhase(req.params.id, getUser(req));
      res.json({ success: true, message: 'Phase deleted' });
    } catch (err) {
      internalError(res, err);
    }
  });

  // --- Items (Tools, WiP, Needs) ---
  app.get('/api/items', (req: Request, res: Response) => {
    try {
      const practiceId = practiceFromQuery(req, res);
      if (!practiceId) return;
      const { type, phaseId, search } = req.query;
      res.json(db.getItems({
        practiceId,
        type: type as string,
        phaseId: phaseId as string,
        search: search as string,
      }));
    } catch (err) {
      internalError(res, err);
    }
  });

  app.get('/api/items/:id', (req: Request, res: Response) => {
    try {
      const item = db.getItem(req.params.id);
      if (!item) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(item);
    } catch (err) {
      internalError(res, err);
    }
  });

  app.post('/api/items', (req: Request, res: Response) => {
    try {
      const practiceId = typeof req.body?.practiceId === 'string' ? req.body.practiceId : '';
      // Tools and WiP need edit rights on the practice; needs can be submitted by anyone
      if (!authorizeCreate(req, res, practiceId, req.body?.type)) return;
      res.status(201).json(db.createItem(req.body, getUser(req)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/items/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getItemPractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      res.json(db.updateItem(req.params.id, req.body, getUser(req)));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/items/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getItemPractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      db.deleteItem(req.params.id, getUser(req));
      res.json({ success: true, message: 'Item deleted' });
    } catch (err) {
      internalError(res, err);
    }
  });

  // --- Dashboard tiles ---
  app.get('/api/dashboard/tiles', (req: Request, res: Response) => {
    try {
      const practiceId = practiceFromQuery(req, res);
      if (practiceId) res.json(db.getDashboardTiles(practiceId));
    } catch (err) {
      internalError(res, err);
    }
  });

  app.delete('/api/dashboard/tiles/:slot', (req: Request, res: Response) => {
    try {
      const practiceId = practiceFromQuery(req, res);
      if (!practiceId || !authorizeEdit(req, res, practiceId)) return;
      if (!db.deleteDashboardTile(practiceId, Number(req.params.slot))) {
        res.status(404).json({ error: 'Tile not found' });
        return;
      }
      res.json({ success: true });
    } catch (err) {
      internalError(res, err);
    }
  });

  // --- Attachments ---
  app.post('/api/items/:id/attachments', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getItemPractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      const { fileName, mimeType, data } = req.body;
      if (!fileName || !mimeType || !data) {
        res.status(400).json({ error: 'Fields fileName, mimeType and data are required' });
        return;
      }
      res.status(201).json(db.addAttachment(req.params.id, { fileName, mimeType, data }));
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/attachments/:id', (req: Request, res: Response) => {
    try {
      if (!req.user) return void authorizeEdit(req, res, '');
      const practiceId = db.getAttachmentPractice(req.params.id);
      if (!practiceId) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }
      if (!authorizeEdit(req, res, practiceId)) return;
      db.deleteAttachment(req.params.id);
      res.json({ success: true });
    } catch (err) {
      internalError(res, err);
    }
  });

  // --- Audit log ---
  app.get('/api/audit-logs', (req: Request, res: Response) => {
    try {
      const practice = typeof req.query.practice === 'string' && req.query.practice ? req.query.practice : undefined;
      res.json(db.getAuditLogs(practice));
    } catch (err) {
      internalError(res, err);
    }
  });

  // --- Chatbot assistant (read-only for anonymous users, writes are checked per practice inside) ---
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, confirmedAction, cancelAction } = req.body;
      if (!message && !confirmedAction && !cancelAction) {
        res.status(400).json({ error: 'Message or requested action missing' });
        return;
      }
      const practiceId = typeof req.body.practiceId === 'string' && req.body.practiceId ? req.body.practiceId : DEFAULT_PRACTICE_ID;
      if (!db.getPractice(practiceId)) {
        res.status(404).json({ error: 'Practice not found' });
        return;
      }
      const result = await handleAssistantChat(
        message || '',
        { user: req.user ?? null, practiceId, ip: req.ip },
        confirmedAction,
        Boolean(cancelAction)
      );
      res.json(result);
    } catch (err) {
      console.error('Chat error:', err);
      internalError(res, err, 'Internal assistant error');
    }
  });

  // --- AI settings: only admins read the full configuration or change it ---
  app.get('/api/settings', (req: Request, res: Response) => {
    try {
      const settings = settingsStore.getClientSettings();
      if (req.user?.role === 'admin') {
        res.json(settings);
      } else {
        res.json({ provider: settings.provider, isConfigured: settings.isConfigured });
      }
    } catch (err) {
      internalError(res, err);
    }
  });

  app.post('/api/settings', requireAdmin, (req: Request, res: Response) => {
    try {
      settingsStore.updateFromRequest(req.body);
      res.json(settingsStore.getClientSettings());
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/settings/test', requireAdmin, async (req: Request, res: Response) => {
    try {
      const result = req.body.provider === 'gemini'
        ? await settingsStore.testGemini(req.body)
        : await settingsStore.testOpenAi(req.body);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
}
