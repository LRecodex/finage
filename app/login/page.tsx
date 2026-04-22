import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  missing_fields: 'Please enter both username and password.',
  invalid_credentials: 'Invalid username or password.',
  try_again_later: 'Too many attempts. Please try again later.',
  server_error: 'Something went wrong. Please try again.',
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const errorCode = params.error ?? '';
  const errorMessage = errorMessages[errorCode];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Finage</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Sign In</h1>
          <p className="mt-2 text-sm text-slate-400">Use your username and password to access the dashboard.</p>

          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          ) : null}

          <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Username</span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-slate-300">Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Login
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-500">
            No register flow yet. Create users with{' '}
            <code>npm run db:create-user -- &lt;username&gt; &lt;password&gt;</code>.
          </p>

          <p className="mt-6 text-sm text-slate-400">
            Health check: <Link href="/api/health/db" className="text-cyan-300 underline">/api/health/db</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
