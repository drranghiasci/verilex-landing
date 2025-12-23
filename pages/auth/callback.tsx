import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Phase = 'auth' | 'claim' | 'error';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('auth');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runFlow = useCallback(async () => {
    setPhase('auth');
    setErrorMessage(null);

    try {
      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const exchange = (supabase.auth as typeof supabase.auth & {
          exchangeCodeForSession?: (url: string) => Promise<{ data: { session: typeof session } | null; error: Error | null }>;
        }).exchangeCodeForSession;

        if (typeof exchange === 'function') {
          const { data, error } = await exchange(window.location.href);
          if (error) throw error;
          session = data?.session ?? null;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 500));
          ({
            data: { session },
          } = await supabase.auth.getSession());
        }
      }

      if (!session) {
        throw new Error('We could not sign you in. Please retry the link from your email.');
      }

      setPhase('claim');
      const { error: claimError } = await supabase.rpc('claim_firm_membership');
      if (claimError) throw claimError;

      router.replace('/myclient/app');
    } catch (error) {
      console.error('Auth callback failed', error);
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to finish sign-in. Please try again.');
    }
  }, [router]);

  useEffect(() => {
    if (router.isReady) {
      runFlow();
    }
  }, [router.isReady, runFlow]);

  return (
    <>
      <Head>
        <title>VeriLex | Authenticating</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            {phase === 'auth' ? 'Finishing sign-in…' : phase === 'claim' ? 'Claiming firm access…' : 'Something went wrong'}
          </h1>
          {phase === 'auth' && (
            <p className="mt-4 text-[color:var(--text-2)]">Verifying your invite link. This only takes a moment.</p>
          )}
          {phase === 'claim' && (
            <p className="mt-4 text-[color:var(--text-2)]">Provisioning your account with firm access. Please keep this tab open.</p>
          )}
          {phase === 'error' && (
            <div className="mt-5 space-y-4 text-sm text-[color:var(--text-1)]">
              <p className="text-red-300">{errorMessage}</p>
              <button
                onClick={runFlow}
                className="w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 font-semibold text-white hover:bg-[color:var(--accent)] transition"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
