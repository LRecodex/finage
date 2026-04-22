import { DatabaseSeeder } from '../database/seeders/DatabaseSeeder.mjs';
import { createDbConnection } from './db-utils.mjs';

async function runSeed() {
  const connection = await createDbConnection();

  try {
    const seeder = new DatabaseSeeder(connection);
    await seeder.run();
    console.log('Seed complete.');
  } finally {
    await connection.end();
  }
}

runSeed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
