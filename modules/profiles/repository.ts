import 'server-only';

import { prisma } from '@/lib/prisma';

import type { ProfileInput, ProfileRecord } from './types';

export async function findProfileRowByUserId(userId: number): Promise<ProfileRecord | null> {
  const row = await prisma.profile.findUnique({
    where: {
      userId: BigInt(userId),
    },
  });

  return row as ProfileRecord | null;
}

export async function insertProfileForUser(userId: number, input: ProfileInput): Promise<number> {
  const row = await prisma.profile.create({
    data: {
      userId: BigInt(userId),
      profilePictureUrl: input.profilePictureUrl,
      name: input.name,
      age: input.age,
    },
    select: {
      id: true,
    },
  });

  return Number(row.id);
}

export async function updateProfileForUserByUserId(userId: number, input: ProfileInput): Promise<boolean> {
  const result = await prisma.profile.updateMany({
    where: {
      userId: BigInt(userId),
    },
    data: {
      profilePictureUrl: input.profilePictureUrl,
      name: input.name,
      age: input.age,
    },
  });

  return result.count > 0;
}

export async function deleteProfileForUserByUserId(userId: number): Promise<boolean> {
  const result = await prisma.profile.deleteMany({
    where: {
      userId: BigInt(userId),
    },
  });

  return result.count > 0;
}
