// app/active-cases/[id]/page.tsx

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabaseServerClient';
import { Database } from '@/types/supabase';
import { Metadata } from 'next';
import React from 'react';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Case #${resolvedParams.id} | VeriLex AI`,
  };
}

const getEnv = (key: string) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
};

// Define the type for caseData based on your Supabase schema
type CaseData = {
  client_name: string;
  client_email: string;
  phone_number?: string;
  state: string;
  county: string;
  case_type: string;
  preferred_contact: string;
  status?: string;
  court_date?: string;
  description: string;
};

export default async function Page({ params }: Props) {
  const resolvedParams = await params;

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') as string;
  const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') as string;

  const supabase = createServerClient();

  const { data: caseData, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !caseData) {
    notFound();
  }

  // Explicitly type caseData to avoid type inference issues
  const typedCaseData: CaseData = caseData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-24 max-w-4xl mx-auto">
      {/* Use typedCaseData instead of caseData */}
      <Link
        href="/dashboard/active-cases"
        className="text-sm text-blue-600 hover:underline mb-6 inline-block"
      >
        ← Back to Active Cases
      </Link>

      <h1 className="text-3xl font-bold mb-2">Case Details</h1>
      <p className="text-gray-600 mb-8">
        Client: <strong>{typedCaseData.client_name}</strong>
      </p>

      <div className="bg-white border border-gray-200 rounded-xl shadow p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-lg">Client Info</h2>
          <p><strong>Email:</strong> {typedCaseData.client_email}</p>
          <p><strong>Phone:</strong> {typedCaseData.phone_number || '—'}</p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Case Info</h2>
          <p><strong>State:</strong> {typedCaseData.state}</p>
          <p><strong>County:</strong> {typedCaseData.county}</p>
          <p><strong>Case Type:</strong> {typedCaseData.case_type}</p>
          <p><strong>Preferred Contact:</strong> {typedCaseData.preferred_contact}</p>
          <p><strong>Status:</strong> {typedCaseData.status || 'open'}</p>
          {typedCaseData.court_date && (
            <p><strong>Court Date:</strong> {new Date(typedCaseData.court_date).toLocaleDateString()}</p>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-lg">Description</h2>
          <p className="whitespace-pre-wrap text-gray-700">
            {typedCaseData.description}
          </p>
        </div>
      </div>
    </div>
  );
}
