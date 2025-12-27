import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';

type CaseRow = {
  id: string;
  client_name: string;
  status: string;
  matter_type: string;
  last_activity_at: string;
  created_at: string;
};

export default function CasesPage() {
  const { state } = useFirm();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  const firmLabel = useMemo(() => (state.firmId ? state.firmId.slice(0, 8) : 'No firm'), [state.firmId]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let isMounted = true;
    const loadCases = async () => {
      setLoading(true);
      setQueryError(null);
      const { data, error } = await supabase
        .from('cases')
        .select('id, client_name, status, matter_type, last_activity_at, created_at')
        .eq('firm_id', state.firmId)
        .order('last_activity_at', { ascending: false })
        .limit(50);

      if (!isMounted) return;
      if (error) {
        setQueryError(error.message);
        setCases([]);
      } else {
        setCases(data ?? []);
      }
      setLoading(false);
    };

    loadCases();
    return () => {
      isMounted = false;
    };
  }, [state.authed, state.firmId]);

  return (
    <>
      <Head>
        <title>MyClient | Cases</title>
      </Head>
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">Active Cases</h1>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Firm {firmLabel} · Role {state.role ?? 'member'}
        </p>

        {state.loading && (
          <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>
        )}

        {!state.loading && !state.authed && (
          <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>
        )}

        {!state.loading && state.authed && !state.firmId && (
          <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>
        )}

        {queryError && (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {queryError}
          </div>
        )}

        {state.authed && state.firmId && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            {loading ? (
              <p className="px-4 py-6 text-[color:var(--text-2)]">Loading...</p>
            ) : cases.length === 0 ? (
              <p className="px-4 py-6 text-[color:var(--text-2)]">No cases yet.</p>
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="text-[color:var(--text-2)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Client</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Matter</th>
                    <th className="px-4 py-3 font-semibold">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[color:var(--text-1)]">
                  {cases.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 text-white">{row.client_name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-white/15 bg-[var(--surface-0)] px-2 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{row.matter_type}</td>
                      <td className="px-4 py-3 text-[color:var(--text-2)]">
                        {new Date(row.last_activity_at ?? row.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
