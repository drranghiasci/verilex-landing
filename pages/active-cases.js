'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-12 max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-extrabold">Active Cases</h1>
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
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
              <h2 className="text-lg font-semibold">{caseItem.client_name}</h2>
              <p className="text-sm text-gray-700">{caseItem.case_type} — {caseItem.state}</p>
              <p className="text-sm text-gray-500 mt-1">Preferred Contact: {caseItem.preferred_contact}</p>
              <p className="text-sm text-gray-500">Email: {caseItem.client_email}</p>
              <p className="text-sm text-gray-500">Phone: {caseItem.phone_number}</p>
              <p className="text-sm text-gray-600 mt-2 italic line-clamp-2">{caseItem.description}</p>
              <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(caseItem.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
