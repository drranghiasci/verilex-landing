'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ActiveCasesPage() {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    const fetchCases = async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cases:', error);
      } else {
        setCases(data);
        setFilteredCases(data);
      }
    };

    fetchCases();
  }, []);

  useEffect(() => {
    let result = cases;

    if (filterType) {
      result = result.filter((c) => c.case_type === filterType);
    }

    if (search) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredCases(result);
  }, [search, filterType, cases]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-20">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="text-xl font-extrabold tracking-tight text-gray-900">VeriLex AI</div>
        <div className="space-x-6 text-sm font-medium">
          <Link href="/">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Home</span>
          </Link>
          <Link href="/dashboard">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Dashboard</span>
          </Link>
          <Link href="/new-case">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">New Case</span>
          </Link>
        </div>
      </nav>

      <div className="pt-24 max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-4">Active Cases</h1>

        <div className="flex flex-wrap gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by name..."
            className="px-4 py-2 border rounded-md w-full md:w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="px-4 py-2 border rounded-md w-full md:w-64"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All Case Types</option>
            <option value="Uncontested Divorce">Uncontested Divorce</option>
            <option value="Contested Divorce">Contested Divorce</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {filteredCases.length === 0 ? (
          <p className="text-gray-600 text-lg">No cases match your criteria.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((c) => (
              <div key={c.id} className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
                <h2 className="text-xl font-bold mb-1">{c.name}</h2>
                <p className="text-gray-700 mb-2">📄 {c.case_type}</p>
                <p className="text-sm text-gray-500 mb-2">
                  {c.description?.slice(0, 100)}{c.description?.length > 100 ? '...' : ''}
                </p>
                <div className="text-xs text-white flex gap-2 flex-wrap mb-3">
                  <span className="bg-gray-800 px-2 py-1 rounded">{c.state}</span>
                  <span className="bg-blue-600 px-2 py-1 rounded">{c.case_type}</span>
                </div>
                {c.file_url && (
                  <a href={c.file_url} target="_blank" className="text-blue-600 underline text-sm">
                    View Uploaded File
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
