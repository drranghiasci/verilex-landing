import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function MyClientHome() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) {
        router.replace('/myclient/app');
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <>
      <Head>
        <title>MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">MyClient Portal</h1>
          <p className="mt-4 text-[color:var(--text-2)]">
            Sign in to access your firm workspace.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/sign-in"
              className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white hover:bg-[color:var(--accent)] transition"
            >
              Sign in
            </Link>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center justify-center rounded-lg border border-white/15 px-5 py-2.5 font-semibold text-white hover:bg-white/10 transition"
            >
              Forgot password
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
