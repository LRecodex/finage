import 'server-only';

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

type AdapterConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

function fromDatabaseUrl(url: string): AdapterConfig {
  const parsed = new URL(url);

  return {
    host: parsed.hostname,
    port: Number(parsed.port || '3306'),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
  };
}

function buildAdapterConfig(): AdapterConfig {
  const envUrl = process.env.DATABASE_URL;

  if (envUrl) {
    return fromDatabaseUrl(envUrl);
  }

  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? 'lrecodex',
    password: process.env.DB_PASSWORD ?? 'LRecodexDB07!',
    database: process.env.DB_NAME ?? 'finage',
  };
}

const adapter = new PrismaMariaDb(buildAdapterConfig());

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
