import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MyClientApp() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error || !data.session?.user) {
        setAuthError('Please sign in to access MyClient.');
        setLoading(false);
        return;
      }
      setUserEmail(data.session.user.email ?? 'Signed in');
      setLoading(false);
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <>
      <Head>
        <title>VeriLex MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
          {loading ? (
            <>
              <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Checking access…</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Validating your session.</p>
            </>
          ) : authError ? (
            <>
              <h1 className="text-3xl font-semibold text-white">Please sign in</h1>
              <p className="mt-4 text-[color:var(--text-2)]">{authError}</p>
              <Link href="/" className="mt-6 inline-block rounded-lg bg-[color:var(--accent-light)] px-5 py-2 text-white font-semibold hover:bg-[color:var(--accent)] transition">
                Go to homepage
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-4xl font-bold text-white">You&apos;re signed in.</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Signed in as {userEmail}</p>
              <button
                onClick={handleSignOut}
                className="mt-8 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
