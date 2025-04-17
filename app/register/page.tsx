'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  /* ------------------------------------------------------------------ */
  /* State                                                              */
  /* ------------------------------------------------------------------ */
  const [form, setForm] = useState({
    fullName: '',
    firmName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessCode: '',
    acceptTerms: false,
    marketingOptIn: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  /* ------------------------------------------------------------------ */
  /* Submit                                                              */
  /* ------------------------------------------------------------------ */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (!form.accessCode.trim()) {
      return setError('Access code is required.');
    }
    if (!form.acceptTerms) {
      return setError('You must agree to the Terms of Service and Privacy Policy.');
    }

    setLoading(true);

    /* 1️⃣  Auth sign‑up */
    const { error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name:       form.fullName,
          firm_name:       form.firmName,
          marketing_optin: form.marketingOptIn,
        },
      },
    });
    if (signUpErr) {
      setError(signUpErr.message || 'Database error saving new user.');
      setLoading(false);
      return;
    }

    /* 2️⃣  Redeem invite */
    const { error: inviteErr } = await supabase.rpc('redeem_invite', {
      invite_code: form.accessCode.trim(),
      new_email:   form.email,
    });

    if (inviteErr) {
      await supabase.auth.signOut();
      setError(inviteErr.message || 'Invalid or already‑used access code.');
      setLoading(false);
      return;
    }

    /* 3️⃣  Success */
    router.push('/dashboard');
  };

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="text-center text-3xl font-extrabold">Create Your Account</h1>
        <p className="mt-1 mb-6 text-center text-sm text-gray-600">
          Invite‑only beta &nbsp;•&nbsp; Use the access code we sent you
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-600 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            name="fullName"
            placeholder="Full name"
            value={form.fullName}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />
          <input
            type="text"
            name="firmName"
            placeholder="Firm name"
            value={form.firmName}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Work email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />
          <input
            type="text"
            name="accessCode"
            placeholder="Access code"
            value={form.accessCode}
            onChange={handleChange}
            className="w-full rounded border border-gray-300 px-4 py-2 placeholder-gray-600 focus:border-indigo-600 focus:outline-none"
            required
          />

          {/* Checkbox: Terms + Privacy */}
          <label className="flex items-start space-x-2 text-sm">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={form.acceptTerms}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-600"
            />
            <span>
              I agree to the{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          {/* Checkbox: marketing opt‑in */}
          <label className="flex items-start space-x-2 text-sm">
            <input
              type="checkbox"
              name="marketingOptIn"
              checked={form.marketingOptIn}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-600"
            />
            <span>Send me occasional product updates and beta tips</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black py-2 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
