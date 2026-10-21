import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from './cors.ts';
import { registerApiRoutes } from './routes.ts';

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

registerApiRoutes(app);

// Start Standalone Server
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`ADM Project Blueprint - Standalone Backend API`);
  console.log(`Port: ${PORT}`);
  console.log(`Data Directory: ${DATA_DIR}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`=========================================`);
});
