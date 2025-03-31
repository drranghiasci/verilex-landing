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
      const res = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Email confirmation error:', data);
        setError('Email confirmation failed.');
      } else {
        setMessage('Success! You’ve been added to the waitlist.');
        setEmail('');
        setName('');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
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
        className="p-2 rounded border border-gray-300"
        required
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="p-2 rounded border border-gray-300"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-green-600">{message}</p>}
    </form>
  );
}
