import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ClaimResponse = { ok: true; firmId: string } | { error: string };

export default function MyClientInviteCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const processInvite = async () => {
      const inviteId = typeof router.query.invite === 'string' ? router.query.invite : null;
      if (!inviteId) {
        setStatus('error');
        setMessage('Missing invite identifier. Please use the link from your email.');
        return;
      }

      let {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!session) {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) {
            setStatus('error');
            setMessage('Unable to verify your invite link. Please try again.');
            return;
          }
          session = result.data.session ?? null;
        }
      }

      if (!session) {
        setStatus('error');
        setMessage('We could not sign you in. Please restart the login process.');
        return;
      }

      try {
        const res = await fetch('/api/myclient/claim-firm-membership', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inviteId }),
        });
        const data: ClaimResponse = await res.json().catch(() => ({ error: 'Unexpected server response.' }));
        if (!res.ok || ('error' in data && data.error)) {
          setStatus('error');
          setMessage('error' in data ? data.error : 'Unable to complete setup. Please try again.');
          return;
        }
        router.replace('/myclient/app');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Unable to complete setup. Please try again.');
      }
    };

    if (router.isReady) {
      processInvite();
    }
  }, [router]);

  return (
    <>
      <Head>
        <title>VeriLex | Completing Setup</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Completing setup…</h1>
          {status === 'loading' ? (
            <p className="mt-4 text-[color:var(--text-2)]">Provisioning your firm access. This takes just a moment.</p>
          ) : (
            message && (
              <p className="mt-4 text-red-300">
                {message}
              </p>
            )
          )}
        </div>
      </div>
    </>
  );
}
