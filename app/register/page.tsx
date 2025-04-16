'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();

  /* -------------------- form state -------------------- */
  const [form, setForm] = useState({
    fullName: '',
    firmName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [agreedToTerms,   setAgreedToTerms]   = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  /* -------------------- handlers -------------------- */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms || !agreedToPrivacy) {
      setError('You must agree to the Terms of Use and Privacy Policy.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, firm_name: form.firmName },
      },
    });

    if (signUpError) setError(signUpError.message);
    else             router.push('/dashboard');

    setLoading(false);
  };

  /* -------------------- render -------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white shadow-xl rounded-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Register for VeriLex AI</h1>
        <p className="text-sm text-gray-700">
          Create your firm’s account to access the legal assistant dashboard.
        </p>

        <form onSubmit={handleRegister} className="space-y-4 text-gray-900">

          {/* --- name / firm / email / pwd fields --- */}
          {['fullName','firmName','email','password','confirmPassword'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-800">
                {{
                  fullName:        'Full Name',
                  firmName:        'Law Firm Name',
                  email:           'Email',
                  password:        'Password',
                  confirmPassword: 'Confirm Password',
                }[field as keyof typeof form]}
              </label>
              <input
                type={field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'}
                name={field}
                value={(form as any)[field]}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 focus:ring-2
                           focus:ring-black focus:outline-none text-gray-900"
              />
            </div>
          ))}

          {/* --- consent checkboxes --- */}
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 accent-black"
                required
              />
              <span>
                I agree to the&nbsp;
                <Link href="/terms" target="_blank"
                      className="underline text-blue-600 hover:text-blue-800">
                  Terms of Use
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="mt-1 accent-black"
                required
              />
              <span>
                I agree to the&nbsp;
                <Link href="/privacy" target="_blank"
                      className="underline text-blue-600 hover:text-blue-800">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-md hover:opacity-90 transition"
          >
            {loading ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-black hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
