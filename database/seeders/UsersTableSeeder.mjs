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
  constructor(prisma) {
    this.prisma = prisma;
  }

  async run() {
    const allowedUsernames = DEFAULT_USERS.map((user) => user.username);

    for (const user of DEFAULT_USERS) {
      const password = getRequiredSeedPassword(user.env);
      const passwordHash = await hashPassword(password);

      await this.prisma.user.upsert({
        where: {
          username: user.username,
        },
        create: {
          username: user.username,
          passwordHash,
        },
        update: {
          passwordHash,
        },
      });

      console.log(`Seeded user '${user.username}'`);
    }

    await this.prisma.user.deleteMany({
      where: {
        username: {
          notIn: allowedUsernames,
        },
      },
    });
  }
}
