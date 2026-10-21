import { Request, Response } from 'express';

// Details go to the server log only: the client never sees internal error messages
export function internalError(res: Response, err: unknown, message = 'Internal server error') {
  console.error(err);
  res.status(500).json({ error: message });
}

// Identity comes only from the session (see auth.ts); anonymous requests are read-only
export function getUser(req: Request): string {
  return req.user?.username ?? 'anonymous';
}
