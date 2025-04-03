'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ActiveCasesPage() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    const fetchCases = async () => {
      const { data, error } = await supabase.from('cases').select('*').order('created_at', { ascending: false });
      if (!error) setCases(data);
    };
    fetchCases();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Image
            src="/verilex-logo-name.png"
            alt="VeriLex AI Logo"
            width={140}
            height={50}
            className="object-contain"
            priority
          />
        </div>
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
          <Link href="/settings">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-28 px-6 max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-8">Active Cases</h1>

        {cases.length === 0 ? (
          <p className="text-gray-600">No active cases found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="p-6 bg-white rounded-xl shadow-sm border">
                <h2 className="text-lg font-semibold">{caseItem.client_name}</h2>
                <p className="text-sm text-gray-700">{caseItem.case_type} — {caseItem.state}</p>
                <p className="text-sm text-gray-500 mt-1">Preferred Contact: {caseItem.preferred_contact}</p>
                <p className="text-sm text-gray-500">Email: {caseItem.client_email}</p>
                <p className="text-sm text-gray-500">Phone: {caseItem.phone_number}</p>
                <p className="text-sm text-gray-600 mt-2 italic">{caseItem.description}</p>
                <p className="text-xs text-gray-400 mt-2">Submitted: {new Date(caseItem.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
