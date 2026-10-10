import { Request, Response } from 'express';

// Details go to the server log only: the client never sees internal error messages
export function internalError(res: Response, err: unknown, message = 'Errore interno del server') {
  console.error(err);
  res.status(500).json({ error: message });
}

export function getUser(req: Request): string {
  const forwarded = req.headers['x-forwarded-user'];
  const value = (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? '';
  const clean = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 128);
  return clean || 'Team T&A';
}
