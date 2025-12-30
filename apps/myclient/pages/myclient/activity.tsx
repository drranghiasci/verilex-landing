import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';
import { canManageMembers } from '@/lib/permissions';

type ActivityRow = {
  id: string;
  case_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  message: string;
  created_at: string;
};

const RANGE_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export default function ActivityPage() {
  const { state } = useFirm();
  const [rangeDays, setRangeDays] = useState(90);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExport = canManageMembers(state.role);

  const rangeStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - rangeDays);
    return date.toISOString();
  }, [rangeDays]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;
    let mounted = true;
    const loadActivity = async () => {
      setLoading(true);
      setError(null);
      const { data, error: activityError } = await supabase
        .from('case_activity')
        .select('id, case_id, actor_user_id, event_type, message, created_at')
        .eq('firm_id', state.firmId)
        .gte('created_at', rangeStart)
        .order('created_at', { ascending: false })
        .limit(200);

      if (!mounted) return;
      if (activityError) {
        setError(activityError.message);
        setRows([]);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    };

    loadActivity();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId, rangeStart]);

  const handleExport = async () => {
    if (!state.firmId || !canExport) return;
    const { data, error: exportError } = await supabase
      .from('case_activity')
      .select('created_at, event_type, message, case_id, actor_user_id')
      .eq('firm_id', state.firmId)
      .gte('created_at', rangeStart)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (exportError) {
      setError(exportError.message);
      return;
    }

    const rowsToExport = data ?? [];
    const header = ['created_at', 'event_type', 'message', 'case_id', 'actor_user_id'];
    const csvLines = [
      header.join(','),
      ...rowsToExport.map((row) =>
        header
          .map((key) => {
            const value = (row as Record<string, unknown>)[key];
            const text = value == null ? '' : String(value);
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(','),
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verilex-activity-${rangeDays}d.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Head>
        <title>MyClient | Activity</title>
      </Head>
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/myclient/app" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold text-white">Activity</h1>
        </div>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">Recent firm activity and exports.</p>

        {!state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {state.authed && !state.firmId && <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>}

        {state.authed && state.firmId && !canExport && (
          <p className="mt-6 text-[color:var(--text-2)]">Admin only. Contact your admin for access.</p>
        )}

        {state.authed && state.firmId && canExport && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <select
                value={rangeDays}
                onChange={(event) => setRangeDays(Number(event.target.value))}
                className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExport}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white"
              >
                Export CSV
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-white/10">
              {loading ? (
                <p className="px-4 py-6 text-[color:var(--text-2)]">Loading...</p>
              ) : rows.length === 0 ? (
                <p className="px-4 py-6 text-[color:var(--text-2)]">No activity for this range.</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {rows.map((row) => (
                    <li key={row.id} className="px-4 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          {row.case_id ? (
                            <Link href={`/myclient/cases/${row.case_id}`} className="text-white hover:text-[color:var(--accent-soft)]">
                              {row.message}
                            </Link>
                          ) : (
                            <p className="text-white">{row.message}</p>
                          )}
                          <p className="text-xs text-[color:var(--text-2)]">{new Date(row.created_at).toLocaleString()}</p>
                        </div>
                        <span className="rounded-full border border-white/15 px-2 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                          {row.event_type}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
