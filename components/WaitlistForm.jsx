'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

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
      setError('Please enter both your name and a valid email.');
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

      setMessage('🎉 You’re on the waitlist! Check your email for confirmation.');
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
      <h1 className="text-4xl font-bold mb-4">Draft. Review. Win. — All in One Platform</h1>
      <p className="text-lg mb-4">
        Join the waitlist for early access to our legal automation platform — built for solo attorneys and small firms.
      </p>
      <p className="text-md mb-8 text-gray-700 dark:text-gray-300">
        Be the first to access tools for legal research, contract review, and case summaries.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-md text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          required
        />
        <input
          type="email"
          placeholder="Your work email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-white/10 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-md text-black dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-md font-semibold hover:opacity-90 transition"
        >
          {loading ? 'Joining...' : 'Request Early Access'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>}
      {message && <p className="mt-4 text-green-600 dark:text-green-400">{message}</p>}

      <div className="mt-12 text-left">
        <h3 className="text-xl font-semibold mb-2">What to Expect</h3>
        <ul className="list-disc list-inside space-y-2 text-gray-800 dark:text-gray-200">
          <li>✅ <span className="text-inherit">Early access to our beta launch</span></li>
          <li>📬 <span className="text-inherit">Exclusive product updates</span></li>
          <li>💬 <span className="text-inherit">Opportunity to shape the product with your feedback</span></li>
        </ul>
      </div>
    </div>
  );
}
