'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      <div className="pt-28 px-6 max-w-6xl mx-auto">
        {/* Back to Dashboard */}
        <div className="mb-6">
          <Link href="/dashboard">
            <div className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition cursor-pointer">
              <span className="mr-1">←</span> Back to Dashboard
            </div>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-extrabold">Active Cases</h1>
          <select
            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="recent">Recently Added</option>
            <option value="alphabetical">Alphabetical (A-Z)</option>
          </select>
        </div>

        {cases.length === 0 ? (
          <p className="text-gray-600">No active cases found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => router.push(`/case/${caseItem.id}`)}
                className="p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">{caseItem.client_name}</h2>
                  <span className="text-sm text-blue-600 hover:underline">View →</span>
                </div>
                <p className="text-sm text-gray-700">
                  {caseItem.case_type} — {caseItem.state}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-gray-200 text-gray-800 px-2 py-1 rounded">
                    Preferred: {caseItem.preferred_contact}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    Email: {caseItem.client_email}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2 italic line-clamp-2">
                  {caseItem.description}
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Submitted: {new Date(caseItem.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
