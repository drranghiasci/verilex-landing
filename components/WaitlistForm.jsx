'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CheckCircle, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');

    if (!email.trim() || !name.trim()) {
      setError('Please enter both your name and a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const { error: supabaseError } = await supabase
        .from('waitlist')
        .insert([{ email, name }]);

      if (supabaseError) {
        if (supabaseError.code === '23505') {
          setError('This email is already on the waitlist.');
        } else {
          console.error('Supabase insert error:', supabaseError);
          setError('Something went wrong. Please try again.');
        }
        setLoading(false);
        return;
      }

      const response = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Email error:', data.error);
        setError('Could not send confirmation email.');
        setLoading(false);
        return;
      }

      setMessage('🎉 You’re officially on the waitlist!');
      setEmail('');
      setName('');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center text-black dark:text-white">
      <h2 className="text-3xl font-bold mb-2">Join the Waitlist</h2>
      <p className="mb-6 text-gray-700 dark:text-gray-300 text-base sm:text-lg">
        Early adopters get beta access, direct feedback opportunities, and exclusive offers.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-white/20 bg-white/10 dark:bg-white/10 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Work Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@lawfirm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 rounded-md border border-gray-300 dark:border-white/20 bg-white/10 dark:bg-white/10 text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 transition disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Request Early Access'}
        </button>
      </form>

      {/* Success */}
      {message && (
        <div className="mt-6 flex items-center justify-center text-green-600 dark:text-green-400 text-sm">
          <CheckCircle className="w-5 h-5 mr-2" />
          {message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-center justify-center text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}

      <div className="mt-12 text-left">
        <h3 className="text-xl font-semibold mb-2">What to Expect</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200 text-sm sm:text-base">
          <li>✅ Priority access to our legal AI tools</li>
          <li>📬 Personalized product updates as features roll out</li>
          <li>💬 Input on features built for solo attorneys & small firms</li>
        </ul>
      </div>
    </div>
  );
}
