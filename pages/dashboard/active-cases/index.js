import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ActiveCasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCases = async () => {
      console.log('Fetching all active cases'); // Debugging log
      const { data, error } = await supabase.from('cases').select('*');
      if (error) {
        console.error('Error fetching cases:', error);
      } else {
        setCases(data);
      }
      setLoading(false);
    };

    fetchCases();
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Active Cases</h1>
      {cases.length === 0 ? (
        <p>No active cases found.</p>
      ) : (
        <ul className="space-y-4">
          {cases.map((caseItem) => (
            <li key={caseItem.id} className="border border-gray-300 p-4 rounded-md">
              <Link href={`/cases/${caseItem.id}`}>
                <a className="text-blue-600 hover:underline">
                  {caseItem.client_name} - {caseItem.case_type}
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
