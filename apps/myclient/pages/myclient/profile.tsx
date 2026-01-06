import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user) {
        if (isMounted) {
          setError(sessionError?.message || 'Please sign in.');
          setLoading(false);
        }
        return;
      }

      const authedUserId = sessionData.session.user.id;
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', authedUserId)
        .limit(1);

      if (!isMounted) return;
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      const profile = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setEmail(profile?.email ?? sessionData.session.user.email ?? null);
      setUserId(authedUserId);
      setFullName(profile?.full_name ?? '');
      setLoading(false);
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setStatus(null);
    setError(null);
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.access_token) {
      setError(sessionError?.message || 'Please sign in.');
      return;
    }

    const res = await fetch('/api/myclient/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ full_name: fullName }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setError(data.error || 'Unable to update profile.');
      return;
    }

    setStatus('Saved');
  };

  return (
    <>
      <Head>
        <title>MyClient | Profile</title>
      </Head>
      <div className="mx-auto max-w-6xl rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/myclient/app"
            className="text-sm text-[color:var(--muted)] hover:text-white transition"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold text-white">Profile</h1>
        </div>
        <p className="mt-2 text-sm text-[color:var(--muted)]">Update your display name for your firm.</p>

        {loading ? (
          <p className="mt-6 text-[color:var(--muted)]">Loading...</p>
        ) : (
          <div className="mt-6 space-y-4">
            {email && <p className="text-sm text-[color:var(--muted)]">Signed in as {email}</p>}
            {userId && (
              <p className="text-sm text-[color:var(--muted)]">User ID: {userId.slice(0, 8)}</p>
            )}
            <label className="block text-sm font-semibold text-white">
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder="Your name"
              />
            </label>
            <button
              onClick={handleSave}
              className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)]"
            >
              Save
            </button>
            {status && <p className="text-sm text-green-300">{status}</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        )}
      </div>
    </>
  );
}
