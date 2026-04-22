'use client';

import Image from 'next/image';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

type Profile = {
  id: number;
  userId: number;
  profilePictureUrl: string;
  name: string;
  age: number;
  createdAt: string;
  updatedAt: string;
};

type ProfileFormState = {
  name: string;
  age: string;
};

type ProfilesCrudProps = {
  initialProfile: Profile | null;
};

const emptyForm: ProfileFormState = {
  name: '',
  age: '',
};

function profileToForm(profile: Profile): ProfileFormState {
  return {
    name: profile.name,
    age: String(profile.age),
  };
}

export default function ProfilesCrud({ initialProfile }: ProfilesCrudProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [form, setForm] = useState<ProfileFormState>(initialProfile ? profileToForm(initialProfile) : emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasProfile = Boolean(profile);

  const selectedPreviewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

  const previewUrl = selectedPreviewUrl ?? profile?.profilePictureUrl ?? null;

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  }

  async function submitForm(event: FormEvent) {
    event.preventDefault();

    if (!hasProfile && !selectedFile) {
      setError('Profile picture is required.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.set('name', form.name);
      payload.set('age', form.age);
      if (selectedFile) {
        payload.set('profilePicture', selectedFile);
      }

      const response = await fetch('/api/profiles', {
        method: hasProfile ? 'PUT' : 'POST',
        body: payload,
      });

      const data = (await response.json()) as { error?: string; profile?: Profile };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? 'Failed to save profile.');
      }

      setProfile(data.profile);
      setForm(profileToForm(data.profile));
      setSelectedFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setBusy(false);
    }
  }

  async function removeProfile() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/profiles', {
        method: 'DELETE',
      });

      const data = (await response.json()) as { error?: string; success?: boolean };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to delete profile.');
      }

      setProfile(null);
      setForm(emptyForm);
      setSelectedFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
      ) : null}

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-white">{hasProfile ? 'Edit Profile' : 'Create Your Profile'}</h2>
        <p className="mt-1 text-sm text-slate-400">Each user has exactly one profile.</p>

        <form onSubmit={submitForm} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            placeholder="Name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />
          <input
            type="number"
            min={1}
            max={120}
            required
            placeholder="Age"
            value={form.age}
            onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          />

          <label className="sm:col-span-2">
            <span className="mb-1 block text-sm text-slate-300">
              {hasProfile ? 'Upload New Profile Picture (optional)' : 'Upload Profile Picture'}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 file:mr-3 file:rounded file:border-0 file:bg-cyan-400 file:px-3 file:py-1 file:font-semibold file:text-slate-950"
            />
          </label>

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Saving...' : hasProfile ? 'Update Profile' : 'Create Profile'}
            </button>

            {hasProfile ? (
              <button
                type="button"
                onClick={removeProfile}
                disabled={busy}
                className="rounded-lg bg-rose-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete Profile
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {profile ? (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold text-white">Current Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr] sm:items-start">
            <div className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-700 sm:w-40">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt={profile.name}
                  fill
                  sizes="160px"
                  className="object-cover"
                  unoptimized
                />
              ) : null}
            </div>

            <div>
              <p className="text-xl font-semibold text-white">{profile.name}</p>
              <p className="mt-1 text-sm text-slate-300">Age: {profile.age}</p>
              <p className="mt-3 text-xs text-slate-500">Updated: {new Date(profile.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
