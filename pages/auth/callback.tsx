import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ClaimResponse = { ok: true; firmId: string } | { error: string };

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error' | 'forbidden'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const claimMembership = useCallback(
    async (token: string) => {
      try {
        const res = await fetch('/api/auth/claim-firm-membership', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.status === 403) {
          setStatus('forbidden');
          setMessage('Your firm has not been provisioned yet. Please contact support.');
          return;
        }

        const data: ClaimResponse = await res.json().catch(() => ({ error: 'Unexpected response from server.' }));

        if (!res.ok || 'error' in data) {
          setStatus('error');
          setMessage('error' in data ? data.error : 'Unable to complete onboarding. Please try again.');
          return;
        }

        router.replace('/myclient/app');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to complete onboarding. Please try again.');
      }
    },
    [router],
  );

  useEffect(() => {
    const handleAuth = async () => {
      setStatus('loading');
      setMessage(null);

      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setStatus('error');
            setMessage('Unable to verify your invite link. Please try again.');
            return;
          }
          session = data.session ?? null;
        }
      }

      if (!session) {
        setStatus('error');
        setMessage('We could not sign you in. Please start the login flow again.');
        return;
      }

      setAccessToken(session.access_token);
      claimMembership(session.access_token);
    };

    if (router.isReady) {
      handleAuth();
    }
  }, [router.isReady, claimMembership]);

  const handleRetry = async () => {
    if (!accessToken) {
      router.replace('/myclient');
      return;
    }
    setStatus('loading');
    setMessage(null);
    await claimMembership(accessToken);
  };

  return (
    <>
      <Head>
        <title>VeriLex MyClient | Authenticating</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Completing sign-in</h1>

          {status === 'loading' && (
            <p className="mt-6 text-[color:var(--text-2)]">Verifying your invite and provisioning your firm access…</p>
          )}

          {status === 'error' && (
            <div className="mt-6 space-y-4 text-sm text-[color:var(--text-1)]">
              <p className="text-red-300">{message}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetry}
                  className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-white font-semibold hover:bg-[color:var(--accent)] transition"
                >
                  Try again
                </button>
                <Link href="/myclient" className="text-[color:var(--accent-soft)] hover:text-white transition">
                  Back to MyClient
                </Link>
              </div>
            </div>
          )}

          {status === 'forbidden' && (
            <div className="mt-6 space-y-4 text-sm text-[color:var(--text-1)]">
              <p>{message}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRetry}
                  className="rounded-lg border border-white/20 px-4 py-2 text-white font-semibold hover:bg-white/10 transition"
                >
                  Retry
                </button>
                <Link href="mailto:support@verilex.ai" className="text-[color:var(--accent-soft)] hover:text-white transition">
                  Contact support
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
