import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
  firm_id: string;
  email?: string | null;
  full_name?: string | null;
};

export default function MembersPage() {
  const { state } = useFirm();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firmLabel = useMemo(() => (state.firmId ? state.firmId.slice(0, 8) : 'No firm'), [state.firmId]);

  useEffect(() => {
    if (!state.authed || !state.firmId || state.role !== 'admin') return;

    let isMounted = true;
    const loadMembers = async () => {
      setLoading(true);
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        if (isMounted) {
          setError(sessionError?.message || 'Please sign in to view members.');
          setLoading(false);
        }
        return;
      }

      const res = await fetch('/api/myclient/members/list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (isMounted) {
          setError(data.error || 'Unable to load members.');
          setMembers([]);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setMembers(Array.isArray(data.members) ? data.members : []);
        setLoading(false);
      }
    };

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [state.authed, state.firmId, state.role]);

  return (
    <>
      <Head>
        <title>MyClient | Members</title>
      </Head>
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">Members</h1>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Firm {firmLabel} · Role {state.role ?? 'member'}
        </p>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}

        {!state.loading && !state.authed && (
          <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>
        )}

        {!state.loading && state.authed && !state.firmId && (
          <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>
        )}

        {!state.loading && state.authed && state.firmId && state.role !== 'admin' && (
          <p className="mt-6 text-[color:var(--text-2)]">You do not have access to view firm members.</p>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {state.authed && state.firmId && state.role === 'admin' && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
            {loading ? (
              <p className="px-4 py-6 text-[color:var(--text-2)]">Loading...</p>
            ) : members.length === 0 ? (
              <p className="px-4 py-6 text-[color:var(--text-2)]">No members found.</p>
            ) : (
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="text-[color:var(--text-2)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[color:var(--text-1)]">
                  {members.map((member) => {
                    const fallbackId = member.user_id.slice(0, 8);
                    return (
                      <tr key={member.user_id}>
                        <td className="px-4 py-3 text-white">{member.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-[color:var(--text-2)]">
                          {member.email ?? `ID: ${fallbackId}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full border border-white/15 bg-[var(--surface-0)] px-2 py-1 text-xs uppercase tracking-wide text-[color:var(--text-2)]">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[color:var(--text-2)]">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
