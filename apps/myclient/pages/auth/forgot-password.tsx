import Head from 'next/head';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://myclient.verilex.us/auth/reset-password',
    });
    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }
    setStatus('Check your email for a password reset link.');
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>MyClient | Reset Password</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold text-white">Forgot password</h1>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">We&apos;ll send a reset link to your email.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm text-[color:var(--text-2)]">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
