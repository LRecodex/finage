import { hashPassword, validatePasswordStrength } from '../../scripts/password-utils.mjs';

function getRequiredSeedPassword(envName) {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`Missing ${envName}. Set it before running db:seed.`);
  }

  const validationError = validatePasswordStrength(value);
  if (validationError) {
    throw new Error(`${envName} is invalid: ${validationError}`);
  }

  return value;
}

const DEFAULT_USERS = [
  { username: 'lrecodex', env: 'SEED_LRECODEX_PASSWORD' },
  { username: 'bubu', env: 'SEED_BUBU_PASSWORD' },
];

export class UsersTableSeeder {
  constructor(connection) {
    this.connection = connection;
  }

  async run() {
    const allowedUsernames = DEFAULT_USERS.map((user) => user.username);

    for (const user of DEFAULT_USERS) {
      const password = getRequiredSeedPassword(user.env);
      const passwordHash = await hashPassword(password);
      await this.connection.query(
        'INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP',
        [user.username, passwordHash]
      );
      console.log(`Seeded user '${user.username}'`);
    }

    await this.connection.query(
      `DELETE FROM users
       WHERE username NOT IN (?, ?)`,
      [allowedUsernames[0], allowedUsernames[1]]
    );
  }
}
