import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

export default function MyClientShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state } = useFirm();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const firmLabel = state.firmId ? state.firmId.slice(0, 8) : 'No firm';

  return (
    <div className="min-h-screen bg-[var(--surface-0)] text-[color:var(--text-1)]">
      <header className="border-b border-white/10 bg-[var(--surface-1)] px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col text-sm">
            <span className="uppercase tracking-[0.25em] text-[color:var(--accent-soft)]">MyClient</span>
            <span className="text-white">Firm: {firmLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-[color:var(--text-2)]">
            <span>Role: {state.role ?? 'member'}</span>
            <span>{state.email ?? 'Signed out'}</span>
            {state.authed && (
              <Link href="/myclient/profile" className="text-white hover:text-[color:var(--accent-soft)] transition">
                Profile
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-white hover:bg-white/10 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      {state.authed ? (
        <main className="px-6 py-12">
          {children}
        </main>
      ) : (
        <main className="px-6 py-20">
          <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
            <h1 className="text-3xl font-semibold text-white">MyClient Portal</h1>
            <p className="mt-4 text-[color:var(--text-2)]">
              Sign in to access your firm workspace.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/auth/sign-in"
                className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white hover:bg-[color:var(--accent)] transition"
              >
                Sign in
              </Link>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
