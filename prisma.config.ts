import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node scripts/seed.mjs',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? 'mysql://lrecodex:LRecodexDB07!@127.0.0.1:3306/finage',
  },
});
