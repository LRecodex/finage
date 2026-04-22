import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import {
  createProfileForUser,
  deleteProfileForUser,
  getProfileForUser,
  updateProfileForUser,
  validateProfileInput,
} from '@/modules/profiles';
import { deleteProfileImage, saveProfileImage } from '@/modules/profiles/image-storage';

export const runtime = 'nodejs';

function getTextField(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function getFileField(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  if (!value || !(value instanceof File) || value.size <= 0) {
    return null;
  }
  return value;
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await getProfileForUser(user.id);
  return NextResponse.json({ profile });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data payload.' }, { status: 400 });
  }

  const file = getFileField(formData, 'profilePicture');
  if (!file) {
    return NextResponse.json({ error: 'Profile picture file is required.' }, { status: 400 });
  }

  let uploadedPath: string | null = null;

  try {
    uploadedPath = await saveProfileImage(file);

    const validated = validateProfileInput({
      name: getTextField(formData, 'name'),
      age: getTextField(formData, 'age'),
      profilePictureUrl: uploadedPath,
    });

    if (!validated.ok) {
      await deleteProfileImage(uploadedPath);
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const profile = await createProfileForUser(user.id, validated.data);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      await deleteProfileImage(uploadedPath);
    }

    if (error instanceof Error && error.message === 'PROFILE_ALREADY_EXISTS') {
      return NextResponse.json({ error: 'Profile already exists for this user.' }, { status: 409 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create profile.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingProfile = await getProfileForUser(user.id);
  if (!existingProfile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data payload.' }, { status: 400 });
  }

  const file = getFileField(formData, 'profilePicture');
  let nextImagePath = existingProfile.profilePictureUrl;

  try {
    if (file) {
      nextImagePath = await saveProfileImage(file);
    }

    const validated = validateProfileInput({
      name: getTextField(formData, 'name'),
      age: getTextField(formData, 'age'),
      profilePictureUrl: nextImagePath,
    });

    if (!validated.ok) {
      if (file && nextImagePath !== existingProfile.profilePictureUrl) {
        await deleteProfileImage(nextImagePath);
      }
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const profile = await updateProfileForUser(user.id, validated.data);
    if (!profile) {
      if (file && nextImagePath !== existingProfile.profilePictureUrl) {
        await deleteProfileImage(nextImagePath);
      }
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
    }

    if (file && existingProfile.profilePictureUrl !== profile.profilePictureUrl) {
      await deleteProfileImage(existingProfile.profilePictureUrl);
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (file && nextImagePath !== existingProfile.profilePictureUrl) {
      await deleteProfileImage(nextImagePath);
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existingProfile = await getProfileForUser(user.id);
  if (!existingProfile) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  const deleted = await deleteProfileForUser(user.id);
  if (!deleted) {
    return NextResponse.json({ error: 'Profile not found.' }, { status: 404 });
  }

  await deleteProfileImage(existingProfile.profilePictureUrl);

  return NextResponse.json({ success: true });
}
