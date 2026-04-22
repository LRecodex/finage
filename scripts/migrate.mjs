import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { createDbConnection, ensureMigrationsTable } from './db-utils.mjs';

export async function runMigrations() {
  const connection = await createDbConnection({ multipleStatements: true });

  try {
    await ensureMigrationsTable(connection);

    const [[batchRow]] = await connection.query(
      'SELECT COALESCE(MAX(batch), 0) AS maxBatch FROM schema_migrations'
    );
    const nextBatch = Number(batchRow.maxBatch || 0) + 1;

    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
      .sort();

    for (const filename of files) {
      const [rows] = await connection.query(
        'SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1',
        [filename]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        console.log(`Skipping ${filename} (already applied)`);
        continue;
      }

      const migrationSql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      console.log(`Applying ${filename}...`);

      await connection.beginTransaction();
      try {
        await connection.query(migrationSql);
        await connection.query('INSERT INTO schema_migrations (filename, batch) VALUES (?, ?)', [
          filename,
          nextBatch,
        ]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }

      console.log(`Applied ${filename}`);
    }

    console.log('Migrations complete.');
  } finally {
    await connection.end();
  }
}

const isDirectRun =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  runMigrations().catch((error) => {
    console.error('Migration failed:', error.message);
    process.exit(1);
  });
}
