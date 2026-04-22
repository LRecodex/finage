import fs from 'fs';
import path from 'path';

import { createDbConnection, ensureMigrationsTable } from './db-utils.mjs';

async function runRollback() {
  const connection = await createDbConnection({ multipleStatements: true });

  try {
    await ensureMigrationsTable(connection);

    const [[batchRow]] = await connection.query(
      'SELECT MAX(batch) AS maxBatch FROM schema_migrations'
    );

    const maxBatch = Number(batchRow.maxBatch || 0);
    if (!maxBatch) {
      console.log('Nothing to rollback.');
      return;
    }

    const [rows] = await connection.query(
      'SELECT id, filename FROM schema_migrations WHERE batch = ? ORDER BY id DESC',
      [maxBatch]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('Nothing to rollback.');
      return;
    }

    const migrationsDir = path.join(process.cwd(), 'migrations');

    for (const migration of rows) {
      const upFilename = migration.filename;
      const downFilename = upFilename.replace(/\.sql$/, '.down.sql');
      const downPath = path.join(migrationsDir, downFilename);

      if (!fs.existsSync(downPath)) {
        throw new Error(`Missing rollback file for ${upFilename}. Expected ${downFilename}`);
      }

      const downSql = fs.readFileSync(downPath, 'utf8');
      console.log(`Rolling back ${upFilename} using ${downFilename}...`);

      await connection.beginTransaction();
      try {
        await connection.query(downSql);
        await connection.query('DELETE FROM schema_migrations WHERE id = ?', [migration.id]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }

      console.log(`Rolled back ${upFilename}`);
    }

    console.log(`Rollback complete for batch ${maxBatch}.`);
  } finally {
    await connection.end();
  }
}

runRollback().catch((error) => {
  console.error('Rollback failed:', error.message);
  process.exit(1);
});
