import * as dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://ops:ops@localhost:5432/ops',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
};