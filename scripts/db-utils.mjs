import nextEnv from '@next/env';
import mysql from 'mysql2/promise';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function createDbConnection(options = {}) {
  return mysql.createConnection({
    host: requiredEnv('DB_HOST'),
    port: Number(process.env.DB_PORT || '3306'),
    database: requiredEnv('DB_NAME'),
    user: requiredEnv('DB_USER'),
    password: requiredEnv('DB_PASSWORD'),
    ...options,
  });
}

export async function ensureMigrationsTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      batch INT UNSIGNED NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [rows] = await connection.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'schema_migrations'
       AND column_name = 'batch'
     LIMIT 1`
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    await connection.query('ALTER TABLE schema_migrations ADD COLUMN batch INT UNSIGNED NULL AFTER filename');
  }

  await connection.query('UPDATE schema_migrations SET batch = 1 WHERE batch IS NULL OR batch = 0');
}
