import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirmContext } from '@/lib/useFirmContext';

export default function MyClientApp() {
  const router = useRouter();
  const { state, refresh } = useFirmContext();
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  const handleClaimAccess = async () => {
    setClaimStatus('Claiming…');
    try {
      const { error } = await supabase.rpc('claim_firm_membership');
      if (error) {
        setClaimStatus(`Error: ${error.message}`);
        return;
      }
      await refresh();
      setClaimStatus('Claimed');
    } catch (err) {
      console.error('Claim firm access failed', err);
      setClaimStatus(`Error: ${err instanceof Error ? err.message : 'Unable to claim access.'}`);
    }
  };

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
          {state.loading ? (
            <>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Checking session…</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Validating your account.</p>
            </>
          ) : !state.authed ? (
            <>
              <h1 className="text-3xl font-semibold text-white">Please sign in</h1>
              <p className="mt-4 text-[color:var(--text-2)]">
                {state.error ?? 'Please sign in to access MyClient.'}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">You&apos;re signed in.</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Signed in as {state.email}</p>
              {state.firmId ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-left text-sm text-[color:var(--text-1)]">
                  <p className="font-semibold text-white">Firm Membership</p>
                  <p className="mt-2">Firm ID: {state.firmId}</p>
                  <p>Role: {state.role ?? 'member'}</p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-sm text-[color:var(--text-2)]">
                  <p className="text-[color:var(--text-1)]">No firm linked yet.</p>
                  <p className="mt-2 text-[color:var(--text-2)]">Having trouble? Finalize your firm access below.</p>
                  <button
                    onClick={handleClaimAccess}
                    className="mt-4 w-full rounded-lg border border-white/15 px-4 py-2 font-semibold text-white hover:bg-white/10 transition"
                  >
                    Finalize Firm Access
                  </button>
                </div>
              )}
              {claimStatus && (
                <p
                  className={`mt-4 text-sm ${
                    claimStatus.startsWith('Error') ? 'text-red-300' : claimStatus === 'Claimed' ? 'text-green-300' : 'text-[color:var(--text-2)]'
                  }`}
                >
                  {claimStatus}
                </p>
              )}
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
