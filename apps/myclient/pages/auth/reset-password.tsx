import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) {
        setSessionValid(true);
        setReady(true);
        return;
      }

      if (typeof supabase.auth.exchangeCodeForSession === 'function') {
        await supabase.auth.exchangeCodeForSession(window.location.href);
        const { data: refreshed } = await supabase.auth.getSession();
        if (mounted && refreshed.session) {
          setSessionValid(true);
        }
      }

      if (mounted) {
        setReady(true);
      }
    };

    initSession();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }
    setStatus('Password updated. Redirecting to sign in…');
    setTimeout(() => router.replace('/auth/sign-in'), 800);
  };

  return (
    <>
      <Head>
        <title>MyClient | Reset Password</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold text-white">Reset password</h1>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">Set a new password for your account.</p>

          {!ready ? (
            <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>
          ) : !sessionValid ? (
            <p className="mt-6 text-[color:var(--text-2)]">Invalid or expired reset link.</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm text-[color:var(--text-2)]">
                New password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
              </label>
              <label className="block text-sm text-[color:var(--text-2)]">
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
              </label>
              {error && <p className="text-sm text-red-300">{error}</p>}
              {status && <p className="text-sm text-green-300">{status}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
