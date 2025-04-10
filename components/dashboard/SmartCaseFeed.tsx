'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface CaseItem {
  id: string;
  client_name: string;
  case_type: string;
  created_at: string;
  status: string;
  is_starred: boolean;
}

export default function SmartCaseFeed() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentCases = async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('id, client_name, case_type, created_at, status, is_starred')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching cases:', error);
      } else {
        setCases(data);
      }
      setLoading(false);
    };

    fetchRecentCases();
  }, []);

  return (
    <div className="bg-white shadow rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">📡 Smart Case Feed</h2>

      {loading ? (
        <p className="text-gray-500">Loading recent case activity...</p>
      ) : cases.length === 0 ? (
        <p className="text-gray-500">No recent activity.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {cases.map((caseItem) => (
            <li key={caseItem.id} className="py-3">
              <Link href={`/active-cases/${caseItem.id}`} className="block hover:underline">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {caseItem.client_name} — {caseItem.case_type}
                    </p>
                    <p className="text-sm text-gray-500">
                      Status: {caseItem.status} • {new Date(caseItem.created_at).toLocaleString()}
                    </p>
                  </div>
                  {caseItem.is_starred && (
                    <span className="text-yellow-500 text-xl ml-3">★</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
