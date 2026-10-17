// Minimal migration runner: applies src/db/migrations/*.sql in filename order,
// recording each in schema_migrations so it runs exactly once.
import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import { config } from '../config';

const MIGRATION_LOCK_ID = 727274; // arbitrary constant for pg_advisory_lock

export async function runMigrations(db: Pool): Promise<string[]> {
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const applied: string[] = [];

  const client = await db.connect();
  try {
    // Advisory lock: if two processes migrate at once, the second waits.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`);

    const { rows } = await client.query('SELECT name FROM schema_migrations');
    const done = new Set(rows.map((r) => r.name as string));

    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        // Each migration is atomic: all of it applies, or none of it.
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
  return applied;
}

// CLI entry: `npm run migrate` (dev DB) or `npm run migrate:test` (test DB).
if (require.main === module) {
  const useTest = process.argv.includes('--test');
  const url = useTest ? config.testDatabaseUrl : config.databaseUrl;
  const db = new Pool({ connectionString: url });
  runMigrations(db)
    .then((applied) => {
      console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'Database already up to date');
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    })
    .finally(() => db.end());
}