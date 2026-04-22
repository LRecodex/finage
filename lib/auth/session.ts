import 'server-only';

import { createHash, randomBytes } from 'crypto';

import { cookies } from 'next/headers';

import { prisma } from '@/lib/prisma';

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

  await prisma.userSession.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });

  await prisma.userSession.create({
    data: {
      userId: BigInt(userId),
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, getCookieOptions(expiresAt));
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const tokenHash = sha256(sessionToken);

    await prisma.userSession.deleteMany({
      where: {
        tokenHash,
      },
    });
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

  const session = await prisma.userSession.findFirst({
    where: {
      tokenHash,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    },
  });

  if (!session) {
    await prisma.userSession.deleteMany({
      where: {
        OR: [
          { tokenHash },
          {
            expiresAt: {
              lte: new Date(),
            },
          },
        ],
      },
    });

    return null;
  }

  return {
    id: Number(session.user.id),
    username: session.user.username,
  };
}
