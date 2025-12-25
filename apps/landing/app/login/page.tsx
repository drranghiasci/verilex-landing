'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import WaveBackground from '@/components/WaveBackground';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setError('Invalid email or password.');
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center relative overflow-hidden transition-colors">
      <WaveBackground className="absolute inset-0 z-0 opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-black/80 border border-black/10 dark:border-white/10 backdrop-blur-sm rounded-xl p-8 space-y-6 shadow-xl">
        <h1 className="text-2xl font-bold">Log in to VeriLex AI</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Secure login for attorneys and legal teams.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-md px-3 py-2 bg-white/10 dark:bg-white/10 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-black/10 dark:border-white/20 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full rounded-md px-3 py-2 bg-white/10 dark:bg-white/10 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-black/10 dark:border-white/20 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-md font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-gray-600 dark:text-gray-400 text-center space-y-1">
          <p>
            Forgot your password?{' '}
            <span className="text-black dark:text-white font-medium cursor-not-allowed">
              (Coming Soon)
            </span>
          </p>
          <p>
            Don’t have an account?{' '}
            <Link href="/register" className="text-black dark:text-white font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
