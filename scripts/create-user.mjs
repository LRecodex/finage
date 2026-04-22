import { createDbConnection } from './db-utils.mjs';
import { hashPassword, validatePasswordStrength } from './password-utils.mjs';

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

  const connection = await createDbConnection();

  try {
    const passwordHash = await hashPassword(password);

    await connection.query(
      'INSERT INTO users (username, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP',
      [username, passwordHash]
    );

    console.log(`User '${username}' is ready.`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Create user failed:', error.message);
  process.exit(1);
});
