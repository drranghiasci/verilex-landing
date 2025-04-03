'use client';

import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function NewCase() {
  const [clientName, setClientName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.from('cases').insert([{ client_name: clientName, case_type: caseType, location }]);

    if (error) {
      setError('Error submitting case. Please try again.');
      console.error(error);
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="w-full shadow-sm bg-white px-6 py-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">VeriLex AI</h1>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-white border-r border-gray-200 p-6 text-gray-700">
          <nav className="space-y-4">
            <a href="/dashboard" className="text-lg hover:underline">Dashboard</a>
            <a href="/new-case" className="text-lg font-semibold text-black">New Case</a>
            <a href="/settings" className="text-lg hover:underline">Settings</a>
          </nav>
        </aside>

        <main className="flex-1 p-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">New Divorce Intake</h2>
          <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
            <div>
              <label className="block text-gray-700 mb-2">Client Name</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g., Jane Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Case Type</label>
              <select
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select one</option>
                <option value="contested">Contested</option>
                <option value="uncontested">Uncontested</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Georgia"
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
            >
              {loading ? 'Submitting...' : 'Submit Case'}
            </button>
            {error && <p className="text-red-600 mt-2">{error}</p>}
          </form>
        </main>
      </div>
    </div>
  );
}
