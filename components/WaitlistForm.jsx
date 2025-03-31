'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WaitlistForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage('');
    setLoading(true);

    if (!email.trim() || !name.trim()) {
      setError('Please enter a valid name and email.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Insert into Supabase waitlist table
      const { error: supabaseError } = await supabase
        .from('waitlist')
        .insert([{ name, email }]);

      if (supabaseError) {
        console.error('Supabase insert error:', supabaseError);
        setError('Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Step 2: Trigger confirmation email
      const response = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', data.error);
        setError('Something went wrong. Please try again.');
      } else {
        setMessage('Success! You’ve been added to the waitlist.');
        setName('');
        setEmail('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border border-gray-300 rounded px-4 py-2"
        required
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-gray-300 rounded px-4 py-2"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
      {message && <p className="text-green-600 text-sm">{message}</p>}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
