import Head from 'next/head';
import { useEffect, useState } from 'react';

type IntakeRow = {
  id: string;
  firm_name: string;
  admin_email: string;
  office_state: string | null;
  office_county: string | null;
  status: string;
  created_at: string;
};

type ApproveResponse =
  | { ok: true; firmId: string; inviteSent: boolean; inviteError?: string }
  | { ok?: false; error: string; firmId?: string | null };

const ADMIN_TOKEN = process.env.NEXT_PUBLIC_ADMIN_DASH_TOKEN;

export default function AdminFirmIntakes() {
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    if (!ADMIN_TOKEN) {
      setError('Missing NEXT_PUBLIC_ADMIN_DASH_TOKEN');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/firm-intakes', {
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load firm intakes');
        return;
      }
      setRows(data.rows || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const approveFirm = async (intakeId: string) => {
    if (!ADMIN_TOKEN) {
      setFeedback('Missing admin token');
      return;
    }
    setActionState((prev) => ({ ...prev, [intakeId]: 'Approving…' }));
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/approve-firm-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_TOKEN,
        },
        body: JSON.stringify({ intakeId }),
      });
      const data: ApproveResponse = await res.json();
      if (!res.ok || ('error' in data && data.error) || data?.ok !== true) {
        setActionState((prev) => ({ ...prev, [intakeId]: 'Failed' }));
        const msg = 'error' in data && data.error ? data.error : 'Approval failed';
        setFeedback(msg);
        return;
      }
      const inviteMsg = data.inviteSent
        ? 'Invite email sent.'
        : `Invite email failed: ${data.inviteError ?? 'Unknown error'}`;
      setActionState((prev) => ({ ...prev, [intakeId]: 'Approved' }));
      setFeedback(`Firm approved (ID ${data.firmId}). ${inviteMsg}`);
      fetchRows();
    } catch (err) {
      setActionState((prev) => ({ ...prev, [intakeId]: 'Failed' }));
      setFeedback(err instanceof Error ? err.message : 'Unexpected error');
    }
  };

  return (
    <>
      <Head>
        <title>VeriLex Admin | Firm Intakes</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">Admin</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Firm Intake Approvals</h1>
            <p className="mt-3 text-[color:var(--text-2)]">
              Review and approve firms awaiting provisioning. Changes apply instantly to Supabase.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {feedback && (
            <div className="mb-6 rounded-lg border border-white/10 bg-[var(--surface-1)] px-4 py-3 text-sm text-white">
              {feedback}
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-[var(--surface-1)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Pending Firms</h2>
                <p className="text-sm text-[color:var(--text-2)]">Showing status: new, reviewing</p>
              </div>
              <button
                onClick={fetchRows}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
              >
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead>
                  <tr className="text-[color:var(--text-2)]">
                    <th className="px-6 py-3 font-semibold">Firm</th>
                    <th className="px-6 py-3 font-semibold">Admin Email</th>
                    <th className="px-6 py-3 font-semibold">State / County</th>
                    <th className="px-6 py-3 font-semibold">Submitted</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[color:var(--text-1)]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[color:var(--text-2)]">
                        Loading firm intakes…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-[color:var(--text-2)]">
                        No pending submissions.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const stateCounty = [row.office_state, row.office_county].filter(Boolean).join(' • ') || '—';
                      const statusLabel = actionState[row.id] ?? row.status;
                      return (
                        <tr key={row.id}>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white">{row.firm_name}</p>
                          </td>
                          <td className="px-6 py-4">{row.admin_email}</td>
                          <td className="px-6 py-4">{stateCounty}</td>
                          <td className="px-6 py-4">{new Date(row.created_at).toLocaleString()}</td>
                          <td className="px-6 py-4 capitalize">{statusLabel}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => approveFirm(row.id)}
                              disabled={actionState[row.id] === 'Approving…'}
                              className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[color:var(--accent)] disabled:opacity-60"
                            >
                              {actionState[row.id] === 'Approving…' ? 'Approving…' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
