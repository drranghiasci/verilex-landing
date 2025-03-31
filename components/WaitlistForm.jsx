HEAD
const [name, setName] = useState('');
const [email, setEmail] = useState('');

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

b45de9d (Add name field to waitlist form and initial setup for email confirmation)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

HEAD
  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter a valid email.');
      return;
    }

    try {
      // Step 1: Insert into Supabase waitlist table
      const { error: supabaseError } = await supabase
        .from('waitlist')
        .insert([{ email }]);

      if (supabaseError) {
        console.error('Supabase insert error:', supabaseError);
        setError('Issue adding to waitlist.');
        return;
      }

      // Step 2: Call your Edge Function to send confirmation email
      const res = await fetch('/functions/v1/send-confirmation-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Edge function error:', data);
        setError('Email added, but failed to send confirmation.');
        return;
      }

      setSubmitted(true);
      setEmail('');
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong.');
=======
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.from('waitlist').insert([{ email, name }]);

    if (error) {
      setMessage('Something went wrong. Please try again.');
      console.error(error);
    } else {
      setMessage("You're on the list! 🎉 Check your email for confirmation.");
      setEmail('');
      setName('');
b45de9d (Add name field to waitlist form and initial setup for email confirmation)
    }

    setLoading(false);
  };

  return (
HEAD
    <div className="flex flex-col md:flex-row gap-2 items-center justify-center mt-6">
      {submitted ? (
        <p className="text-green-600 font-medium">✅ You’re on the waitlist! Check your email 🎉</p>
      ) : (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-4 py-2 rounded border border-gray-300 w-80"
          />
          <button
            onClick={handleSubmit}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Join Waitlist
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </>
      )}
    </div>
=======
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-md mx-auto w-full">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border px-4 py-2 rounded-md"
        required
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-4 py-2 rounded-md"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
      {message && <p className="text-sm text-center mt-2">{message}</p>}
    </form>
b45de9d (Add name field to waitlist form and initial setup for email confirmation)
  );
}
