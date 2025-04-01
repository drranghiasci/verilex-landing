import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email.trim() || !name.trim()) {
      setError('Please enter your name and a valid email.');
      return;
    }

    const { error: supabaseError } = await supabase
      .from('waitlist')
      .insert({ name, email });

    if (supabaseError) {
      console.error('Supabase insert error:', supabaseError);
      setError('Something went wrong. Please try again.');
      return;
    }

    const res = await fetch('/api/send-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });

    if (!res.ok) {
      setError('Something went wrong. Please try again.');
      return;
    }

    setSuccess(true);
    setName('');
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-200 text-gray-900">
      <Head>
        <title>VeriLex AI – Join the Waitlist</title>
        <meta name="description" content="VeriLex AI helps automate legal research, summarize cases, and review contracts." />
      </Head>

      <header className="flex justify-between items-center px-6 py-4">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={180}
          height={50}
          className="object-contain"
        />
      </header>

      <main className="flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight max-w-2xl">
          Your AI-Powered Legal Assistant
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-xl">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg shadow-md transition"
          >
            Join Waitlist
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">Thanks! You're on the list ✨</p>}
        </form>

        <section className="mt-16 w-full max-w-4xl text-left">
          <h2 className="text-2xl font-semibold mb-4">What’s coming next</h2>
          <ul className="space-y-2 text-gray-700">
            <li>✅ Automated legal research powered by AI</li>
            <li>✅ Natural-language contract review & suggestions</li>
            <li>✅ Early beta access for solo practitioners</li>
            <li>✅ Priority feedback loop to shape the roadmap</li>
          </ul>
        </section>
      </main>

      <footer className="mt-16 text-xs text-gray-500 px-4 pb-8 text-center">
        VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
      </footer>
    </div>
  );
}
