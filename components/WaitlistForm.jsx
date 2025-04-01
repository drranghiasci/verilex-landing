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

    if (!email.trim() || !name.trim()) {
      setError('Please enter both your name and a valid email.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Insert into Supabase
      const { error: supabaseError } = await supabase
        .from('waitlist')
        .insert([{ email, name }]);

      if (supabaseError) {
        console.error('Supabase insert error:', supabaseError);
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Send confirmation email
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

      // Success
      setMessage('You’re on the waitlist! Check your email for confirmation.');
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
    <div className="max-w-xl mx-auto px-4 py-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Your AI-Powered Legal Assistant</h1>
      <p className="text-lg mb-6">
        Join the waitlist for early access to our legal automation platform — built for solo attorneys and small firms.
      </p>

      <p className="text-md mb-6 text-gray-600">
        Be the first to access tools for legal research, contract review, and case summaries.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Your full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
        <input
          type="email"
          placeholder="Your work email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
        >
          {loading ? 'Joining...' : 'Request Early Access'}
        </button>
      </form>

      {error && <p className="mt-4 text-red-600">{error}</p>}
      {message && <p className="mt-4 text-green-600">{message}</p>}

      <div className="mt-10 text-left">
        <h3 className="text-xl font-semibold mb-2">What to Expect</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-1">
          <li>✅ Early access to our beta launch</li>
          <li>📬 Exclusive product updates</li>
          <li>💬 Opportunity to shape the product with your feedback</li>
        </ul>
      </div>
    </div>
  );
}
