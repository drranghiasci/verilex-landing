'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import WaveBackground from '@/components/WaveBackground';

interface WaveBackgroundProps {
  className?: string;
}

export function LocalWaveBackground({ className }: WaveBackgroundProps) {
  return (
    <svg
      className={className}
      // SVG content here
    />
  );
}

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
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-white dark:bg-gray-900 transition-colors">
      {/* Fullscreen wave background */}
      <LocalWaveBackground className="absolute inset-0 z-0" />

      {/* Login card */}
      <div className="relative z-10 max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 space-y-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Log in to VeriLex AI</h1>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Secure login for attorneys and legal teams.
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-gray-900 dark:text-white">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-md hover:opacity-90 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-gray-600 dark:text-gray-400 text-center space-y-1">
          <p>
            Forgot your password?{' '}
            <span className="text-gray-800 dark:text-gray-200 font-medium cursor-not-allowed">
              (Coming Soon)
            </span>
          </p>
          <p>
            Don’t have an account?{' '}
            <Link
              href="/register"
              className="text-black dark:text-white font-medium hover:underline"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
