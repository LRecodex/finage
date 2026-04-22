import Link from 'next/link';
import { redirect } from 'next/navigation';

import ProfilesCrud from '@/components/profiles/profiles-crud';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfileForUser } from '@/modules/profiles';

export default async function ProfilesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const profile = await getProfileForUser(user.id);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Profile CRUD Demo</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Manage Your Profile</h1>
            <p className="mt-2 text-sm text-slate-400">Signed in as {user.username}</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        <ProfilesCrud initialProfile={profile} />
      </div>
    </main>
  );
}
