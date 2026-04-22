import { NextResponse } from 'next/server';

import { getDummyPasswordHash, verifyPassword } from '@/lib/auth/password';
import { clearLoginSecurityState, isRateLimited, isUserTemporarilyLocked, recordFailedLoginAttempt } from '@/lib/auth/login-security';
import { createSessionForUser } from '@/lib/auth/session';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

type UserRow = {
  id: number;
  username: string;
  password_hash: string;
  failed_login_attempts: number;
  lockout_until: Date | null;
};

function redirectTo(request: Request, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!username || !password) {
      return redirectTo(request, '/login?error=missing_fields');
    }

    const rateLimited = await isRateLimited(request, username);
    if (rateLimited) {
      return redirectTo(request, '/login?error=try_again_later');
    }

    const [rows] = await db.execute(
      'SELECT id, username, password_hash, failed_login_attempts, lockout_until FROM users WHERE username = :username LIMIT 1',
      { username }
    );

    const users = rows as UserRow[];
    const user = users[0];

    if (!user) {
      await verifyPassword(password, await getDummyPasswordHash());
      await recordFailedLoginAttempt(request, username);
      return redirectTo(request, '/login?error=invalid_credentials');
    }

    const userLocked = await isUserTemporarilyLocked(user);
    if (userLocked) {
      await recordFailedLoginAttempt(request, username, user.id);
      return redirectTo(request, '/login?error=try_again_later');
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      await recordFailedLoginAttempt(request, username, user.id);
      return redirectTo(request, '/login?error=invalid_credentials');
    }

    await clearLoginSecurityState(request, username, user.id);
    await createSessionForUser(user.id);

    return redirectTo(request, '/dashboard');
  } catch {
    return redirectTo(request, '/login?error=server_error');
  }
}
