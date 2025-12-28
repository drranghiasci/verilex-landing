import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.replace('/myclient/app');
  };

  return (
    <>
      <Head>
        <title>MyClient | Sign In</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold text-white">Sign in</h1>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">Access your MyClient workspace.</p>
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
            <label className="block text-sm text-[color:var(--text-2)]">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                required
              />
            </label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-4 text-sm text-[color:var(--text-2)]">
            <Link href="/auth/forgot-password" className="hover:text-white">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
