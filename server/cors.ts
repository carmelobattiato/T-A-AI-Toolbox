import { Request, Response, NextFunction } from 'express';

// The app is same-origin (Vite in dev, nginx in production), so no CORS headers are sent
// unless CORS_ORIGIN lists the allowed origins (comma separated).
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowed = (process.env.CORS_ORIGIN ?? '').split(',').map(o => o.trim()).filter(Boolean);
  const origin = req.headers.origin;
  const permitted = typeof origin === 'string' && allowed.includes(origin);

  if (permitted) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-forwarded-user');
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(permitted ? 200 : 204);
    return;
  }
  next();
}
