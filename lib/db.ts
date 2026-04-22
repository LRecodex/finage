import 'server-only';

import mysql from 'mysql2/promise';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const dbConfig = {
  host: requireEnv('DB_HOST'),
  port: Number(process.env.DB_PORT ?? '3306'),
  database: requireEnv('DB_NAME'),
  user: requireEnv('DB_USER'),
  password: requireEnv('DB_PASSWORD'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const globalForDb = globalThis as unknown as {
  mysqlPool?: mysql.Pool;
};

export const db =
  globalForDb.mysqlPool ??
  mysql.createPool({
    ...dbConfig,
    namedPlaceholders: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.mysqlPool = db;
}

export async function testDbConnection(): Promise<void> {
  const connection = await db.getConnection();
  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}
