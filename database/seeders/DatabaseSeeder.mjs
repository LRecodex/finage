import { UsersTableSeeder } from './UsersTableSeeder.mjs';

export class DatabaseSeeder {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async run() {
    await new UsersTableSeeder(this.prisma).run();
  }
}
