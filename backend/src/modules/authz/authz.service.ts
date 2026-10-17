// Authorization checks that hit the database. Every mutating endpoint
// (Phases 2-3) calls assertCan() before changing anything.
import { Db, pool } from '../../db';
import { ForbiddenError } from '../../shared/errors';
import { Action, Role, can } from './permissions';

// The user's role in a team, or null if they are not a member.
export async function getRole(userId: string, teamId: string, db: Db = pool): Promise<Role | null> {
  const { rows } = await db.query(
    'SELECT role FROM memberships WHERE user_id = $1 AND team_id = $2',
    [userId, teamId],
  );
  return (rows[0]?.role as Role) ?? null;
}

// Throws 403 unless the user's role in `teamId` allows `action`. Returns the role on success.
// Accepts a transaction client so the check can run inside the same transaction as the mutation.
export async function assertCan(userId: string, teamId: string, action: Action, db: Db = pool): Promise<Role> {
  const role = await getRole(userId, teamId, db);
  if (!role) throw new ForbiddenError('You are not a member of this team');
  if (!can(role, action)) throw new ForbiddenError(`Your role (${role}) cannot perform ${action}`);
  return role;
}