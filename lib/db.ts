import 'server-only';

import { prisma } from '@/lib/prisma';

export { prisma as db };

export async function testDbConnection(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
