'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
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

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (loginError) {
      setError('Invalid email or password.');
    } else {
      router.push('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Log in to VeriLex AI</h1>
        <p className="text-sm text-gray-700">Welcome back — secure login for attorneys and staff.</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-800">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="text-sm text-gray-600 text-center space-y-1">
          <p>
            Forgot your password?{' '}
            <span className="text-blue-600 cursor-pointer hover:underline">
              (Coming Soon)
            </span>
          </p>
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
