import { hashPassword, validatePasswordStrength } from './password-utils.mjs';
import { prisma } from './prisma-client.mjs';

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: node scripts/create-user.mjs <username> <password>');
    process.exit(1);
  }

  const validationError = validatePasswordStrength(password);
  if (validationError) {
    console.error(`Create user failed: ${validationError}`);
    process.exit(1);
  }

  try {
    const passwordHash = await hashPassword(password);

    await prisma.user.upsert({
      where: { username },
      create: {
        username,
        passwordHash,
      },
      update: {
        passwordHash,
      },
    });

    console.log(`User '${username}' is ready.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Create user failed:', error.message);
  process.exit(1);
});
