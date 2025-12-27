import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

type CaseRecord = {
  id: string;
  firm_id: string;
  client_name: string;
  matter_type: string;
  status: string;
  intake_summary: string | null;
  internal_notes: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = ['open', 'pending', 'closed'] as const;

export default function CaseDetailPage() {
  const router = useRouter();
  const { state } = useFirm();
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caseId = useMemo(() => (typeof router.query.id === 'string' ? router.query.id : null), [router.query.id]);

  useEffect(() => {
    if (!state.authed || !state.firmId || !caseId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadCase = async () => {
      setLoading(true);
      setError(null);
      const { data, error: caseError } = await supabase
        .from('cases')
        .select(
          'id, firm_id, client_name, matter_type, status, intake_summary, internal_notes, last_activity_at, created_at, updated_at',
        )
        .eq('id', caseId)
        .limit(1);

      if (!mounted) return;
      if (caseError) {
        setError(caseError.message);
        setRecord(null);
      } else {
        const row = Array.isArray(data) && data.length > 0 ? (data[0] as CaseRecord) : null;
        setRecord(row);
      }
      setLoading(false);
    };

    loadCase();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId, caseId]);

  const handleChange = (field: keyof CaseRecord) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!record) return;
    setRecord({ ...record, [field]: event.target.value });
  };

  const handleSave = async () => {
    if (!record) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        setError(sessionError.message);
        return;
      }
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Please sign in to save changes.');
        return;
      }
      const res = await fetch('/api/myclient/cases/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: record.id,
          client_name: record.client_name,
          matter_type: record.matter_type,
          status: record.status,
          internal_notes: record.internal_notes ?? '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Unable to save changes.');
        return;
      }

      const { data: refreshed, error: refreshError } = await supabase
        .from('cases')
        .select(
          'id, firm_id, client_name, matter_type, status, intake_summary, internal_notes, last_activity_at, created_at, updated_at',
        )
        .eq('id', record.id)
        .limit(1);

      if (refreshError) {
        setError(refreshError.message);
        return;
      }
      const row = Array.isArray(refreshed) && refreshed.length > 0 ? (refreshed[0] as CaseRecord) : null;
      setRecord(row);
      setMessage('Saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>MyClient | Case Detail</title>
      </Head>
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <Link href="/myclient/cases" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
          ← Back to Active Cases
        </Link>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>}

        {loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}

        {!loading && state.authed && state.firmId && !record && !error && (
          <p className="mt-6 text-[color:var(--text-2)]">Case not found.</p>
        )}

        {record && (
          <>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-white">{record.client_name}</h1>
                <p className="mt-2 text-sm text-[color:var(--text-2)]">Matter type: {record.matter_type}</p>
              </div>
              <span className="rounded-full border border-white/15 bg-[var(--surface-0)] px-3 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                {record.status}
              </span>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <label className="block text-sm text-[color:var(--text-2)]">
                  Client name
                  <input
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.client_name}
                    onChange={handleChange('client_name')}
                  />
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Matter type
                  <input
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.matter_type}
                    onChange={handleChange('matter_type')}
                  />
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Status
                  <select
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.status}
                    onChange={handleChange('status')}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Internal notes
                  <textarea
                    className="mt-2 h-40 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    value={record.internal_notes ?? ''}
                    onChange={handleChange('internal_notes')}
                  />
                </label>
              </div>
            </div>

            <div className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4 text-sm text-[color:var(--text-2)] md:grid-cols-3">
              <div>
                <p className="text-white">Created</p>
                <p>{new Date(record.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white">Last activity</p>
                <p>{new Date(record.last_activity_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-white">Updated</p>
                <p>{new Date(record.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              {message && <span className="text-sm text-green-300">{message}</span>}
            </div>
          </>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
