import { UsersTableSeeder } from './UsersTableSeeder.mjs';

export class DatabaseSeeder {
  constructor(connection) {
    this.connection = connection;
  }

  async run() {
    await new UsersTableSeeder(this.connection).run();
  }
}
