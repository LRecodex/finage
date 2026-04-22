import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <section className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Welcome, {user.username}</h1>
          <p className="mt-2 text-sm text-slate-400">
            You are logged in with username-based authentication.
          </p>

          <div className="mt-6">
            <Link
              href="/dashboard/profiles"
              className="inline-flex rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Open Profile CRUD Demo
            </Link>
          </div>

          <form action="/api/auth/logout" method="post" className="mt-8">
            <button
              type="submit"
              className="rounded-lg bg-rose-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-rose-300"
            >
              Logout
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
