import { createDbConnection } from './db-utils.mjs';
import { runMigrations } from './migrate.mjs';

async function runFresh() {
  const connection = await createDbConnection();

  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    const [tables] = await connection.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_type = 'BASE TABLE'`
    );

    for (const row of tables) {
      const tableName = row.table_name;
      await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      console.log(`Dropped table ${tableName}`);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  } finally {
    await connection.end();
  }

  await runMigrations();
  console.log('Fresh migration complete.');
}

runFresh().catch((error) => {
  console.error('Fresh failed:', error.message);
  process.exit(1);
});
