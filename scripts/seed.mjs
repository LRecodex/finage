import { DatabaseSeeder } from '../database/seeders/DatabaseSeeder.mjs';
import { prisma } from './prisma-client.mjs';

async function runSeed() {
  try {
    const seeder = new DatabaseSeeder(prisma);
    await seeder.run();
    console.log('Seed complete.');
  } finally {
    await prisma.$disconnect();
  }
}

runSeed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
