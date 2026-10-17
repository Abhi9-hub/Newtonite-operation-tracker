// Builds the Express app. Kept separate from index.ts so tests can import it without opening a port.
import cors from 'cors';
import express from 'express';
import { pool } from './db';
import { authRouter } from './modules/auth/auth.routes';
import { errorHandler, notFoundHandler } from './shared/errorHandler';
import { requestContext } from './shared/requestContext';

export function createApp() {
  const app = express();

  app.use(requestContext);              // 1. request id first, so every log/error has one
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  app.use('/auth', authRouter);         // later phases mount /work-items etc. here

  app.use(notFoundHandler);             // unknown routes
  app.use(errorHandler);                // MUST be last: catches everything above
  return app;
}