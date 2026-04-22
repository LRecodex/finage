import 'server-only';

import {
  deleteProfileForUserByUserId,
  findProfileRowByUserId,
  insertProfileForUser,
  updateProfileForUserByUserId,
} from './repository';
import type { Profile, ProfileInput, ProfileRecord } from './types';

function mapProfileRow(row: ProfileRecord): Profile {
  return {
    id: Number(row.id),
    userId: Number(row.userId),
    profilePictureUrl: row.profilePictureUrl,
    name: row.name,
    age: row.age,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getProfileForUser(userId: number): Promise<Profile | null> {
  const row = await findProfileRowByUserId(userId);
  return row ? mapProfileRow(row) : null;
}

export async function createProfileForUser(userId: number, input: ProfileInput): Promise<Profile> {
  const existing = await findProfileRowByUserId(userId);
  if (existing) {
    throw new Error('PROFILE_ALREADY_EXISTS');
  }

  await insertProfileForUser(userId, input);
  const profile = await getProfileForUser(userId);

  if (!profile) {
    throw new Error('Failed to load created profile.');
  }

  return profile;
}

export async function updateProfileForUser(userId: number, input: ProfileInput): Promise<Profile | null> {
  const updated = await updateProfileForUserByUserId(userId, input);

  if (!updated) {
    return null;
  }

  return getProfileForUser(userId);
}

export async function deleteProfileForUser(userId: number): Promise<boolean> {
  return deleteProfileForUserByUserId(userId);
}
