import * as dotenv from 'dotenv';

dotenv.config();

const env = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

// Fail fast: refuse to boot in production with the insecure default secret.
if (env === 'production' && jwtSecret === 'dev-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  env,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://ops:ops@localhost:5432/ops',
  testDatabaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://ops:ops@localhost:5432/ops_test',
  jwtSecret,
  jwtExpiresInSeconds: 60 * 60 * 8,
};