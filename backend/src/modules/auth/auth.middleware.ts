// requireAuth: attaches req.user or rejects with 401. Put it in front of any protected route.
import type { RequestHandler } from 'express';
import { pool } from '../../db';
import { UnauthorizedError } from '../../shared/errors';
import { verifyToken } from './auth.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization') ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedError();

    const userId = verifyToken(token);

    // Re-check the user on every request so deactivated users lose access immediately.
    const { rows } = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1 AND is_active = true',
      [userId],
    );
    if (!rows[0]) throw new UnauthorizedError('Account no longer active');

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};