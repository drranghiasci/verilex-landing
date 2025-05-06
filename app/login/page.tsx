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
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Wave background from landing */}
      <WaveBackground className="absolute inset-0 z-0 pointer-events-none opacity-40" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md bg-black/70 border border-white/10 backdrop-blur-sm rounded-xl p-8 space-y-6 shadow-xl">
        <h1 className="text-2xl font-bold">Log in to VeriLex AI</h1>
        <p className="text-sm text-gray-300">
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
              className="w-full rounded-md px-3 py-2 bg-white/10 text-white placeholder-gray-400 border border-white/10 focus:ring-2 focus:ring-white focus:outline-none"
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
              className="w-full rounded-md px-3 py-2 bg-white/10 text-white placeholder-gray-400 border border-white/10 focus:ring-2 focus:ring-white focus:outline-none"
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-2 rounded-md font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-gray-400 text-center space-y-1">
          <p>
            Forgot your password?{' '}
            <span className="text-white font-medium cursor-not-allowed">
              (Coming Soon)
            </span>
          </p>
          <p>
            Don’t have an account?{' '}
            <Link href="/register" className="text-white font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
