'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CaseDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchCase = async () => {
        const { data, error } = await supabase
          .from('cases')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching case:', error);
        } else {
          setCaseData(data);
        }
        setLoading(false);
      };

      fetchCase();
    }
  }, [id]);

  if (loading) return <p className="p-8">Loading case details...</p>;

  if (!caseData) return <p className="p-8 text-red-600">Case not found.</p>;

  return (
    <div className="min-h-screen bg-white px-8 pt-24 max-w-4xl mx-auto">
      <Link href="/active-cases">
        <span className="inline-flex items-center text-sm text-gray-700 hover:underline mb-6">
          ← Back to Active Cases
        </span>
      </Link>

      <h1 className="text-4xl font-bold mb-4">Case Details</h1>

      <div className="bg-gray-100 rounded-md p-6 shadow">
        <p className="text-lg font-semibold mb-2">Client: {caseData.client_name}</p>
        <p className="mb-1"><span className="font-medium">Email:</span> {caseData.client_email}</p>
        <p className="mb-1"><span className="font-medium">Phone:</span> {caseData.phone_number || '—'}</p>
        <p className="mb-1"><span className="font-medium">State:</span> {caseData.state}</p>
        <p className="mb-1"><span className="font-medium">County:</span> {caseData.county}</p>
        <p className="mb-1"><span className="font-medium">Preferred Contact:</span> {caseData.preferred_contact}</p>
        <p className="mb-1"><span className="font-medium">Case Type:</span> {caseData.case_type}</p>
        <p className="mt-4 whitespace-pre-wrap"><span className="font-medium">Description:</span><br />{caseData.description}</p>
      </div>
    </div>
  );
}
