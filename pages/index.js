import Head from 'next/head';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !name.trim()) {
      setError('Please enter your name and a valid email.');
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from('waitlist').insert({ name, email });
    if (insertError) {
      console.error('Supabase error:', insertError);
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Email confirmation failed');
      }

      setSuccess(true);
      setName('');
      setEmail('');
    } catch (err) {
      console.error('Email error:', err);
      setError('We received your info, but email failed to send.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-100 flex flex-col items-center justify-center p-6">
      <Head>
        <title>VeriLex AI — Waitlist</title>
      </Head>

      <img
        src="/verilex-logo-name.png"
        alt="VeriLex AI Logo"
        className="w-48 mb-6 opacity-90"
      />

      <h1 className="text-4xl font-bold text-center text-gray-900 mb-4 animate-fade-in">
        Your AI-Powered Legal Assistant
      </h1>
      <p className="text-center text-gray-600 max-w-xl animate-fade-in delay-100">
        Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 mt-8 w-full max-w-md animate-fade-in delay-200"
      >
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Waitlist'}
        </button>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-600 text-sm text-center">You're on the waitlist! ✅</p>}
      </form>

      <section className="mt-20 text-center animate-fade-in delay-300">
        <h2 className="text-2xl font-semibold mb-4">What’s Coming</h2>
        <ul className="text-gray-700 space-y-2">
          <li>✅ Automated contract analysis for lawyers</li>
          <li>✅ Real-time legal case summarization</li>
          <li>🚀 Draft filing generator (coming soon)</li>
          <li>🧠 Natural language legal research assistant</li>
        </ul>
        <p className="text-gray-500 mt-6 text-sm">We’ll reach out with early access updates soon.</p>
      </section>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 1s ease-out both;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
