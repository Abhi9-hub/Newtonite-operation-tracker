import { Pool, PoolClient } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

// An idle client erroring must not crash the process; log it and move on.
pool.on('error', (err) => console.error('[db] idle client error:', err.message));

// Anything that can run queries: the pool itself or a transaction client.
// Services accept this so the same function works inside or outside a transaction.
export type Db = Pick<Pool, 'query'>;

/**
 * Runs `fn` inside a transaction: COMMIT if it resolves, ROLLBACK if it throws.
 * This is what guarantees "mutation + activity log row" succeed or fail together.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    // Rollback failure must not mask the original error.
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release(); // always return the connection to the pool
  }
}