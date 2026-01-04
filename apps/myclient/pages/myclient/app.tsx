import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

export default function MyClientApp() {
  const { state, refresh } = useFirm();
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [openTasks, setOpenTasks] = useState<
    { id: string; title: string; due_date: string | null; case_id: string }[]
  >([]);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Activity feed moved to global panel and /myclient/activity page.

  useEffect(() => {
    if (!state.authed || !state.firmId) return;
    let mounted = true;
    const loadTasks = async () => {
      setTasksError(null);
      const { data, error } = await supabase
        .from('case_tasks')
        .select('id, title, due_date, case_id')
        .eq('firm_id', state.firmId)
        .eq('status', 'open')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (!mounted) return;
      if (error) {
        setTasksError(error.message);
        setOpenTasks([]);
      } else {
        setOpenTasks(data ?? []);
      }
    };
    loadTasks();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId]);

  const fetchMembership = async (userId: string) => {
    const { data } = await supabase
      .from('firm_members')
      .select('firm_id, role')
      .eq('user_id', userId)
      .limit(1);
    const member = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return member?.firm_id ?? null;
  };

  const handleClaimAccess = async () => {
    setClaimStatus('Claiming…');
    try {
      const { error } = await supabase.rpc('claim_firm_membership');
      if (error) {
        if (error.message.includes('No pending invite found')) {
          await refresh();
          const firmId = state.userId ? await fetchMembership(state.userId) : null;
          if (firmId) {
            setClaimStatus('Claimed');
            return;
          }
        }
        setClaimStatus(`Error: ${error.message}`);
        return;
      }
      await refresh();
      setClaimStatus('Claimed');
    } catch (err) {
      console.error('Claim firm access failed', err);
      setClaimStatus(`Error: ${err instanceof Error ? err.message : 'Unable to claim access.'}`);
    }
  };

  return (
    <>
      <Head>
        <title>MyClient</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-8">
        {state.firmId ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">Today&apos;s Snapshot</h2>
              <p className="mt-3 text-[color:var(--text-2)]">
                Your firm&apos;s latest activity and workload trends will appear here soon.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {['Active Cases', 'Upcoming Deadlines', 'Client Messages', 'Documents Reviewed'].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-sm text-[color:var(--text-2)]"
                  >
                    <p className="text-white">{label}</p>
                    <p className="mt-2 text-[color:var(--text-2)]">Coming soon</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
                <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
                <div className="mt-6 grid gap-4">
                  {[
                    { label: 'Active Cases', href: '/myclient/cases' },
                    { label: 'New Case Intake', href: '/myclient/intake' },
                    { label: 'Documents', href: '/myclient/documents' },
                    { label: 'Members', href: '/myclient/members' },
                    { label: 'Profile', href: '/myclient/profile' },
                    { label: 'Activity', href: '/myclient/activity' },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="rounded-2xl border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-sm text-[color:var(--text-1)] hover:bg-white/10 transition"
                    >
                      <div className="font-medium text-white">{item.label}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Open Tasks</h2>
                  <Link href="/myclient/cases" className="text-xs text-[color:var(--text-2)] hover:text-white transition">
                    View cases
                  </Link>
                </div>
                {tasksError && <p className="mt-3 text-xs text-red-300">{tasksError}</p>}
                {openTasks.length === 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--text-2)]">No open tasks.</p>
                ) : (
                  <ul className="mt-4 space-y-3 text-sm text-[color:var(--text-2)]">
                    {openTasks.map((task) => (
                      <li key={task.id} className="rounded-xl border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <p className="text-white">{task.title}</p>
                          <div className="flex items-center gap-2 text-xs text-[color:var(--text-2)]">
                            {task.due_date && <span>Due {new Date(task.due_date).toLocaleDateString()}</span>}
                            <Link href={`/myclient/cases/${task.case_id}`} className="hover:text-white">
                              View case
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {state.role && (state.role === 'admin' || state.role === 'attorney') && (
                  <p className="mt-3 text-xs text-[color:var(--text-2)]">
                    Add tasks from within a case.
                  </p>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-semibold text-white">No firm linked yet</h2>
            <p className="mt-3 text-[color:var(--text-2)]">
              We&apos;re finalizing your access. If you&apos;re stuck, finalize firm access below.
            </p>
            <button
              onClick={handleClaimAccess}
              className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2 font-semibold text-white hover:bg-white/10 transition"
            >
              Finalize Firm Access
            </button>
            {claimStatus && (
              <p
                className={`mt-4 text-sm ${
                  claimStatus.startsWith('Error') ? 'text-red-300' : claimStatus === 'Claimed' ? 'text-green-300' : 'text-[color:var(--text-2)]'
                }`}
              >
                {claimStatus}
              </p>
            )}
          </div>
        )}
        {state.error && (
          <p className="text-sm text-red-300">Error: {state.error}</p>
        )}
      </div>
    </>
  );
}
