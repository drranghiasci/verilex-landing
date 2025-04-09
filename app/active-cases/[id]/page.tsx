// app/active-cases/[id]/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabaseServerClient';
import { Database } from '@/types/supabase'; // Make sure this exists
import React = require('react');
interface CaseDetailsPageProps {
  params: {
    id: string;
  };
}

export default async function CaseDetailsPage({ params }: CaseDetailsPageProps) {
  const supabase = createServerClient();

  const { data: caseData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !caseData) {
    notFound(); // this will trigger the 404 page
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-24 max-w-4xl mx-auto">
      <Link
        href="/dashboard/active-cases"
        className="text-sm text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to Active Cases
      </Link>

      <h1 className="text-3xl font-bold mb-2">Case Details</h1>
      <p className="text-gray-600 mb-8">
        Client: <strong>{caseData.client_name}</strong>
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Client Info</h2>
          <p><strong>Email:</strong> {caseData.client_email}</p>
          <p><strong>Phone:</strong> {caseData.phone_number || '—'}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Case Info</h2>
          <p><strong>State:</strong> {caseData.state}</p>
          <p><strong>County:</strong> {caseData.county}</p>
          <p><strong>Case Type:</strong> {caseData.case_type}</p>
          <p><strong>Preferred Contact:</strong> {caseData.preferred_contact}</p>
          <p><strong>Status:</strong> {caseData.status || 'open'}</p>
          {caseData.court_date && (
            <p><strong>Court Date:</strong> {new Date(caseData.court_date).toLocaleDateString()}</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-lg">Description</h2>
          <p className="whitespace-pre-wrap text-gray-700">
            {caseData.description}
          </p>
        </div>
      </div>
    </div>
  );
}
