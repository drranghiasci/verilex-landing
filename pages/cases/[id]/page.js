'use client';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CasePage() {
  return (
    <div>
      <h1>Case Page</h1>
      <p>This is a placeholder page for case details.</p>
    </div>
  );
}

export default function CaseDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchCase = async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (!error) {
        setCaseDetails(data);
      }
      setLoading(false);
    };
    fetchCase();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <p className="pt-28 px-8 text-center">Loading...</p>;
  if (!caseDetails) return <p className="pt-28 px-8 text-center">Case not found.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-8">
      <div className="pt-28 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/active-cases">
          <span className="inline-flex items-center text-sm text-gray-700 hover:text-black transition mb-6">
            ← Back to Active Cases
          </span>
        </Link>

        <h1 className="text-3xl font-extrabold mb-6">Case Details</h1>

        {/* Case Info */}
        <div className="space-y-4 bg-white p-6 rounded-xl shadow-md">
          <p><strong>Client Name:</strong> {caseDetails.client_name}</p>
          <p><strong>Email:</strong> {caseDetails.client_email}</p>
          <p><strong>Phone Number:</strong> {caseDetails.phone_number}</p>
          <p><strong>State:</strong> {caseDetails.state}</p>
          <p><strong>Case Type:</strong> {caseDetails.case_type}</p>
          <p><strong>Preferred Contact:</strong> {caseDetails.preferred_contact}</p>
          {caseDetails.location && (
            <p><strong>Location:</strong> {caseDetails.location}</p>
          )}
          <p><strong>Case Description:</strong> {caseDetails.description}</p>
          <p className="text-sm text-gray-500">
            Submitted: {new Date(caseDetails.created_at).toLocaleString()}
          </p>
        </div>

        {/* Internal Notes */}
        <div className="mt-10">
          <label className="block font-semibold mb-2">Internal Notes</label>
          <textarea
            className="w-full border border-gray-300 rounded-md px-4 py-2"
            placeholder="Write internal notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        {/* File Upload Preview Placeholder */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold mb-2">File Uploads</h3>
          <p className="text-gray-500 italic">File preview coming soon...</p>
        </div>

        {/* Print/Export */}
        <div className="mt-10">
          <button
            onClick={handlePrint}
            className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition"
          >
            Print / Export
          </button>
        </div>
      </div>
    </div>
  );
}
