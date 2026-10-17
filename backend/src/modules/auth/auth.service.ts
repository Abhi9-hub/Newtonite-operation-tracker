// Authentication business logic. No Express objects in here, so it is easy to test.
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { pool } from '../../db';
import { UnauthorizedError } from '../../shared/errors';

// Compared against when the email is unknown, so response time does not
// reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function login(email: string, password: string) {
  const { rows } = await pool.query(
    'SELECT id, email, name, password_hash, is_active FROM users WHERE email = $1',
    [email],
  );
  const user = rows[0];
  const passwordOk = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  // Same message for "no such user", "wrong password" and "disabled".
  if (!user || !passwordOk || !user.is_active) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // The token only identifies the user. Roles are looked up per request (see authz).
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresInSeconds,
  });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

// Returns the user id inside a valid token, or throws 401.
export function verifyToken(token: string): string {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === 'object' && typeof payload.sub === 'string') return payload.sub;
  } catch {
    /* fall through to the error below */
  }
  throw new UnauthorizedError('Invalid or expired token');
}

// Profile + the teams/roles the user holds. The frontend uses this to decide which controls to show
// (the server still enforces everything independently).
export async function getProfile(userId: string) {
  const user = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
  const memberships = await pool.query(
    `SELECT t.id AS "teamId", t.name AS "teamName", m.role
       FROM memberships m JOIN teams t ON t.id = m.team_id
      WHERE m.user_id = $1
      ORDER BY t.name`,
    [userId],
  );
  return { ...user.rows[0], memberships: memberships.rows };
}