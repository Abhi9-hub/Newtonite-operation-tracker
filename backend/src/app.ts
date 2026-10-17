import express from 'express';
import cors from 'cors';
import { pool } from './db';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  return app;
}