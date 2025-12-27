import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Phase = 'auth' | 'claim' | 'error';
type Step = 'setSession' | 'getSession' | 'rpc' | 'redirect';

type HashTokens = {
  accessToken?: string;
  refreshToken?: string;
};

const parseHashTokens = (hash: string): HashTokens => {
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const accessToken = params.get('access_token') ?? undefined;
  const refreshToken = params.get('refresh_token') ?? undefined;
  return { accessToken, refreshToken };
};

export default function AuthCallback() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('auth');
  const [message, setMessage] = useState<string>('Finishing sign-in…');
  const [step, setStep] = useState<Step>('setSession');

  const runFlow = useCallback(async () => {
    setPhase('auth');
    setMessage('Finishing sign-in…');
    setStep('setSession');

    try {
      const { accessToken, refreshToken } = parseHashTokens(window.location.hash);

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
      } else {
        const exchange = (supabase.auth as typeof supabase.auth & {
          exchangeCodeForSession?: (url: string) => Promise<{ data: { session: unknown } | null; error: Error | null }>;
        }).exchangeCodeForSession;

        if (typeof exchange === 'function') {
          const { error } = await exchange(window.location.href);
          if (error) throw error;
        }
      }

      setStep('getSession');
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        throw new Error('We could not complete sign-in. Please try the invite link again.');
      }

      setPhase('claim');
      setMessage('Claiming firm access…');
      setStep('rpc');
      const { error: claimError } = await supabase.rpc('claim_firm_membership');
      if (claimError) throw claimError;

      setStep('redirect');
      router.replace('/myclient/app');
    } catch (error) {
      console.error('Auth callback error', error);
      setPhase('error');
      const detail = error instanceof Error ? error.message : 'Unable to finish sign-in. Please try again.';
      setMessage(`Step: ${step}. ${detail}`);
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
        <title>MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            {phase === 'error' ? 'Setup failed' : 'Finishing setup'}
          </h1>
          <p className="mt-4 text-[color:var(--text-2)]">{message}</p>
          {phase === 'error' && (
            <button
              onClick={runFlow}
              className="mt-6 w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 font-semibold text-white hover:bg-[color:var(--accent)] transition"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </>
  );
}
