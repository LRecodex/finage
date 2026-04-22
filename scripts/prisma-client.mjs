import nextEnv from '@next/env';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function fromDatabaseUrl(url) {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || '3306'),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  };
}

function buildAdapterConfig() {
  if (process.env.DATABASE_URL) {
    return fromDatabaseUrl(process.env.DATABASE_URL);
  }

  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'lrecodex',
    password: process.env.DB_PASSWORD || 'LRecodexDB07!',
    database: process.env.DB_NAME || 'finage',
  };
}

const adapter = new PrismaMariaDb(buildAdapterConfig());

export const prisma = new PrismaClient({ adapter });
