import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function MyClientApp() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [membership, setMembership] = useState<{ firmId: string; role: string } | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  const loadMembership = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('firm_members')
      .select('firm_id, role')
      .eq('user_id', userId)
      .single();

    if (error) {
      setMembership(null);
      return;
    }

    if (data?.firm_id && data.role) {
      setMembership({ firmId: data.firm_id, role: data.role });
    } else {
      setMembership(null);
    }
  }, []);

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
      await loadMembership(data.session.user.id);
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, [loadMembership]);

  const handleClaimAccess = async () => {
    setClaimStatus('Claiming…');
    try {
      const { error } = await supabase.rpc('claim_firm_membership');
      if (error) {
        setClaimStatus(`Error: ${error.message}`);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await loadMembership(session.user.id);
      }
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
            </>
          ) : (
            <>
              <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">You&apos;re signed in.</h1>
              <p className="mt-4 text-[color:var(--text-2)]">Signed in as {email}</p>
              {membership ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-left text-sm text-[color:var(--text-1)]">
                  <p className="font-semibold text-white">Firm Membership</p>
                  <p className="mt-2">Firm ID: {membership.firmId}</p>
                  <p>Role: {membership.role}</p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-sm text-[color:var(--text-2)]">
                  No firm linked yet.
                  <button
                    onClick={handleClaimAccess}
                    className="mt-4 w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 font-semibold text-white hover:bg-[color:var(--accent)] transition"
                  >
                    Claim Firm Access
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
