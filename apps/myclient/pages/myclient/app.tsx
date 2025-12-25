import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MyClientApp() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error || !data.session?.user) {
        setErrorMessage('Please sign in to access MyClient.');
        setLoading(false);
        return;
      }
      setEmail(data.session.user.email ?? 'Signed in');
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  return (
    <>
      <Head>
        <title>MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
          {loading ? (
            <>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Checking session…</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Validating your account.</p>
            </>
          ) : errorMessage ? (
            <>
              <h1 className="text-3xl font-semibold text-white">Please sign in</h1>
              <p className="mt-4 text-[color:var(--text-2)]">{errorMessage}</p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white hover:bg-[color:var(--accent)] transition"
              >
                Go to homepage
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">You&apos;re signed in.</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Signed in as {email}</p>
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
