'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    fullName: '',
    firmName: '',
    email: '',
    password: '',
    confirmPassword: '',
    accessCode: '',
    acceptTerms: false,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /* ----------------------------- Handlers ----------------------------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!form.accessCode.trim()) {
      setError('Access code is required.');
      return;
    }
    if (!form.acceptTerms) {
      setError('You must accept the Terms of Service.');
      return;
    }

    setLoading(true);

    /* 1️⃣  Sign up through Supabase auth */
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, firm_name: form.firmName },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    /* 2️⃣  Redeem the invite code */
    const { error: inviteError } = await supabase.rpc('redeem_invite', {
      invite_code: form.accessCode.trim(),
      new_email:   form.email,
    });

    if (inviteError) {
      // Roll back: you may choose to delete the unfinished user here
      await supabase.auth.signOut();
      setError(inviteError.message || 'Invalid or already‑used access code.');
      setLoading(false);
      return;
    }

    /* 3️⃣  Success → dashboard */
    router.push('/dashboard');
  };

  /* ------------------------------ JSX -------------------------------- */
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-3xl font-bold">Create Your Account</h1>

      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="text"
          name="fullName"
          placeholder="Full name"
          value={form.fullName}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />
        <input
          type="text"
          name="firmName"
          placeholder="Firm name"
          value={form.firmName}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Work email"
          value={form.email}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm password"
          value={form.confirmPassword}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />
        <input
          type="text"
          name="accessCode"
          placeholder="Access code"
          value={form.accessCode}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-4 py-2"
          required
        />

        {/* Terms checkbox */}
        <label className="flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={form.acceptTerms}
            onChange={handleChange}
            className="h-4 w-4"
          />
          <span>
            I agree to the&nbsp;
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black py-2 text-white hover:bg-gray-800 transition"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
    </div>
  );
}
