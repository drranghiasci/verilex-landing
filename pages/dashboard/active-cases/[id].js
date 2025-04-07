import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function CaseDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [caseDetails, setCaseDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchCaseDetails = async () => {
        const { data, error } = await supabase.from('cases').select('*').eq('id', id).single();
        if (error) {
          console.error('Error fetching case details:', error);
        } else {
          setCaseDetails(data);
        }
        setLoading(false);
      };

      fetchCaseDetails();
    }
  }, [id]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!caseDetails) {
    return <p>Case not found.</p>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Case Details</h1>
      <p><strong>Client Name:</strong> {caseDetails.client_name}</p>
      <p><strong>Client Email:</strong> {caseDetails.client_email}</p>
      <p><strong>Phone Number:</strong> {caseDetails.phone_number}</p>
      <p><strong>State:</strong> {caseDetails.state}</p>
      <p><strong>County:</strong> {caseDetails.county}</p>
      <p><strong>Case Type:</strong> {caseDetails.case_type}</p>
      <p><strong>Preferred Contact:</strong> {caseDetails.preferred_contact}</p>
      <p><strong>Description:</strong> {caseDetails.description}</p>
    </div>
  );
}
