// Dev seed: wipes all data and inserts demo teams and users. NEVER runs in production.
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../db';
import { config } from '../config';

async function seed() {
  if (config.env === 'production') throw new Error('Refusing to seed in production');
  const hash = await bcrypt.hash('password123', 10);

  await withTransaction(async (db) => {
    await db.query(
      `TRUNCATE idempotency_keys, comments, activity_log, work_items, memberships, teams, users
       RESTART IDENTITY CASCADE`,
    );

    const team = async (name: string) =>
      (await db.query('INSERT INTO teams (name) VALUES ($1) RETURNING id', [name])).rows[0].id as string;
    const user = async (email: string, name: string) =>
      (await db.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [email, name, hash],
      )).rows[0].id as string;
    const join = (u: string, t: string, role: string) =>
      db.query('INSERT INTO memberships (user_id, team_id, role) VALUES ($1, $2, $3)', [u, t, role]);

    const payments = await team('Payments');
    const platform = await team('Platform');

    const alice = await user('alice@example.com', 'Alice (lead)');
    const bob = await user('bob@example.com', 'Bob');
    const carol = await user('carol@example.com', 'Carol');
    const dave = await user('dave@example.com', 'Dave');
    const erin = await user('erin@example.com', 'Erin');

    await join(alice, payments, 'lead');     // alice: lead in Payments...
    await join(alice, platform, 'member');   // ...but only a member in Platform
    await join(bob, payments, 'member');
    await join(carol, payments, 'viewer');   // read-only user
    await join(dave, platform, 'lead');      // dave has NO access to Payments (cross-team test)
    await join(erin, platform, 'member');
  });

  console.log('Seeded. All users have password: password123');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());