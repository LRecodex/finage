import 'server-only';

import { createHash, randomBytes } from 'crypto';

import { cookies } from 'next/headers';

import { db } from '@/lib/db';

const SESSION_COOKIE_NAME = 'finage_session';
const SESSION_TTL_DAYS = 7;

type DbUser = {
  id: number;
  username: string;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function getSessionExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
  return expiresAt;
}

function getCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

export async function createSessionForUser(userId: number): Promise<void> {
  const sessionToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(sessionToken);
  const expiresAt = getSessionExpiryDate();

  await db.execute('DELETE FROM user_sessions WHERE expires_at <= UTC_TIMESTAMP()');

  await db.execute(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (:userId, :tokenHash, :expiresAt)',
    {
      userId,
      tokenHash,
      expiresAt,
    }
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getCookieOptions(expiresAt));
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const tokenHash = sha256(sessionToken);
    await db.execute('DELETE FROM user_sessions WHERE token_hash = :tokenHash', { tokenHash });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentUser(): Promise<DbUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const tokenHash = sha256(sessionToken);

  const [rows] = await db.execute(
    `SELECT u.id, u.username
     FROM user_sessions us
     INNER JOIN users u ON u.id = us.user_id
     WHERE us.token_hash = :tokenHash
       AND us.expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    { tokenHash }
  );

  const users = rows as DbUser[];
  const user = users[0] ?? null;

  if (!user) {
    await db.execute('DELETE FROM user_sessions WHERE token_hash = :tokenHash OR expires_at <= UTC_TIMESTAMP()', {
      tokenHash,
    });
  }

  return user;
}
