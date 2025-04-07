'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ActiveCasesPage() {
  const [cases, setCases] = useState([]);
  const [sortOption, setSortOption] = useState('recent');
  const router = useRouter();

  useEffect(() => {
    const fetchCases = async () => {
      let query = supabase.from('cases').select('*');
      if (sortOption === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sortOption === 'alphabetical') {
        query = query.order('client_name', { ascending: true });
      }
      const { data, error } = await query;
      if (!error) setCases(data);
    };
    fetchCases();
  }, [sortOption]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-28 max-w-6xl mx-auto">
      {/* Back to Dashboard */}
      <div className="mb-8">
        <Link href="/dashboard">
          <span className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition cursor-pointer">
            ← Back to Dashboard
          </span>
        </Link>
      </div>

      {/* Title and Sort */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-extrabold">Active Cases</h1>
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm shadow-sm"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="recent">Recently Added</option>
          <option value="alphabetical">Alphabetical (A-Z)</option>
        </select>
      </div>

      {/* Case Cards */}
      {cases.length === 0 ? (
        <p className="text-gray-600">No active cases found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((caseItem) => (
            <div
              key={caseItem.id}
              onClick={() => router.push(`/case/${caseItem.id}`)}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">{caseItem.client_name}</h2>
                  <span className="text-sm text-blue-600 hover:underline">View →</span>
                </div>
                <p className="text-sm text-gray-700">
                  {caseItem.case_type} — {caseItem.state}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Preferred: {caseItem.preferred_contact}
                </p>
                <p className="text-xs text-gray-500">Email: {caseItem.client_email}</p>
                <p className="text-xs text-gray-500">Phone: {caseItem.phone_number}</p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-600 italic line-clamp-2">{caseItem.description}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Submitted: {new Date(caseItem.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
