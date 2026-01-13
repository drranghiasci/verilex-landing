import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';
import { CaseCreateSchema, buildCaseTitle } from '@/lib/caseSchema';
import { canEditCases } from '@/lib/permissions';
import { useFirmPlan } from '@/lib/useFirmPlan';
import { canCreateCase } from '@/lib/plans';

const STATUS_OPTIONS = ['open', 'paused', 'closed'] as const;

type IntakeQueueItem = {
  id: string;
  status: string;
  submitted_at: string | null;
  matter_type: string | null;
  urgency_level: string | null;
  intake_channel: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

type Wf4RunRow = {
  intake_id: string;
  status: string;
  created_at: string;
};

const WF4_STATUS_STYLES: Record<string, string> = {
  ready: 'border-emerald-400/40 text-emerald-200',
  loading: 'border-sky-400/40 text-sky-200',
  down: 'border-red-400/40 text-red-200',
};

function formatIntakeClient(payload: Record<string, unknown> | null) {
  if (!payload) return 'Unknown client';
  const first = typeof payload.client_first_name === 'string' ? payload.client_first_name.trim() : '';
  const last = typeof payload.client_last_name === 'string' ? payload.client_last_name.trim() : '';
  const full = [first, last].filter(Boolean).join(' ');
  return full || 'Unknown client';
}

function formatIntakeSubtitle(item: IntakeQueueItem) {
  const bits = [
    item.matter_type ? `${item.matter_type}` : null,
    item.urgency_level ? `${item.urgency_level}` : null,
    item.intake_channel ? `${item.intake_channel}` : null,
  ].filter(Boolean);
  return bits.length > 0 ? bits.join(' • ') : 'Intake submitted';
}

export default function IntakePage() {
  const router = useRouter();
  const { state } = useFirm();
  const { plan, loading: planLoading } = useFirmPlan();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [matterType, setMatterType] = useState('Divorce');
  const [status, setStatus] = useState('open');
  const [title, setTitle] = useState('');
  const [hasCustomTitle, setHasCustomTitle] = useState(false);
  const [stateField, setStateField] = useState('');
  const [county, setCounty] = useState('');
  const [courtName, setCourtName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [caseCountLoading, setCaseCountLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'automatic'>('manual');
  const [intakeQueue, setIntakeQueue] = useState<IntakeQueueItem[]>([]);
  const [wf4StatusMap, setWf4StatusMap] = useState<Record<string, string>>({});
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);

  const canEdit = canEditCases(state.role);
  const isReadOnly = Boolean(state.authed && state.firmId && !canEdit);
  const limitCheck =
    caseCount === null ? { ok: true } : canCreateCase({ plan, currentCaseCount: caseCount });
  const limitReached = !planLoading && caseCount !== null && !limitCheck.ok;

  const isPermissionError = (message?: string | null) => {
    if (!message) return false;
    const lower = message.toLowerCase();
    return lower.includes('permission') || lower.includes('policy') || lower.includes('not allowed');
  };

  useEffect(() => {
    if (hasCustomTitle) return;
    if (!firstName.trim() && !lastName.trim()) {
      setTitle('');
      return;
    }
    const generated = buildCaseTitle({
      client_first_name: firstName,
      client_last_name: lastName,
      matter_type: matterType,
      title: '',
      status,
      client_email: email,
      client_phone: phone,
      state: stateField,
      county,
      court_name: courtName,
      case_number: caseNumber,
      internal_notes: notes,
    });
    setTitle(generated);
  }, [county, courtName, email, firstName, hasCustomTitle, lastName, matterType, notes, phone, caseNumber, stateField, status]);

  useEffect(() => {
    if (router.query.tab !== 'automatic') return;
    setActiveTab('automatic');
  }, [router.query.tab]);

  const loadQueue = useCallback(async () => {
    if (!state.authed || !state.firmId) return;
    setQueueLoading(true);
    setQueueError(null);
    const { data, error: intakeError } = await supabase
      .from('intakes')
      .select('id, status, submitted_at, matter_type, urgency_level, intake_channel, created_at, raw_payload')
      .eq('firm_id', state.firmId)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false })
      .limit(50);

    if (intakeError) {
      setQueueError(intakeError.message);
      setIntakeQueue([]);
    } else {
      const items = (data ?? []) as IntakeQueueItem[];
      setIntakeQueue(items);

      if (items.length > 0) {
        const intakeIds = items.map((item) => item.id);
        const { data: wf4Runs, error: wf4Error } = await supabase
          .from('ai_runs')
          .select('intake_id, status, created_at')
          .eq('firm_id', state.firmId)
          .eq('run_kind', 'wf4')
          .in('intake_id', intakeIds);

        if (wf4Error) {
          setWf4StatusMap({});
        } else {
          const latestByIntake: Record<string, Wf4RunRow> = {};
          (wf4Runs ?? []).forEach((row) => {
            const entry = row as Wf4RunRow;
            const existing = latestByIntake[entry.intake_id];
            if (!existing || entry.created_at > existing.created_at) {
              latestByIntake[entry.intake_id] = entry;
            }
          });

          const statusMap: Record<string, string> = {};
          Object.entries(latestByIntake).forEach(([intakeId, entry]) => {
            statusMap[intakeId] = entry.status;
          });
          setWf4StatusMap(statusMap);
        }
      } else {
        setWf4StatusMap({});
      }
    }
    setQueueLoading(false);
  }, [state.authed, state.firmId]);

  useEffect(() => {
    if (activeTab !== 'automatic') return;
    void loadQueue();
  }, [activeTab, loadQueue]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let mounted = true;
    const loadCount = async () => {
      setCaseCountLoading(true);
      const { count, error: countError } = await supabase
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', state.firmId);

      if (!mounted) return;
      if (countError) {
        setCaseCount(null);
      } else {
        setCaseCount(count ?? 0);
      }
      setCaseCountLoading(false);
    };

    loadCount();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasCustomTitle(value.trim().length > 0);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!state.firmId) {
      setError('No firm linked yet.');
      return;
    }

    if (!canEdit) {
      setError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }

    if (limitReached) {
      setError(`${'reason' in limitCheck ? limitCheck.reason : 'Limit reached.'} Upgrade to Pro to add more cases.`);
      return;
    }

    const parsed = CaseCreateSchema.safeParse({
      client_first_name: firstName,
      client_last_name: lastName,
      client_email: email,
      client_phone: phone,
      title,
      matter_type: matterType,
      status,
      state: stateField,
      county,
      court_name: courtName,
      case_number: caseNumber,
      internal_notes: notes,
    });

    if (!parsed.success) {
      const nextErrors: { firstName?: string; lastName?: string } = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0] === 'client_first_name') nextErrors.firstName = err.message;
        if (err.path[0] === 'client_last_name') nextErrors.lastName = err.message;
      });
      setFieldErrors(nextErrors);
      setError(parsed.error.errors[0]?.message || 'Please check the intake fields.');
      return;
    }

    setSubmitting(true);
    try {
      const input = parsed.data;
      const finalTitle = buildCaseTitle(input);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setError(sessionError?.message || 'Please sign in to create a case.');
        return;
      }

      const res = await fetch('/api/myclient/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          client_first_name: input.client_first_name,
          client_last_name: input.client_last_name,
          client_email: input.client_email || null,
          client_phone: input.client_phone || null,
          title: finalTitle,
          matter_type: input.matter_type || 'Divorce',
          status: input.status || 'open',
          state: input.state || null,
          county: input.county || null,
          court_name: input.court_name || null,
          case_number: input.case_number || null,
          internal_notes: input.internal_notes || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.error || 'Unable to create case.';
        setError(isPermissionError(msg) ? 'You don’t have permission to perform this action. Please contact your firm admin.' : msg);
        return;
      }

      router.push(`/myclient/cases/${data.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>MyClient | New Case Intake</title>
      </Head>
      <div className="mx-auto max-w-6xl rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/myclient/app"
            className="text-sm text-[color:var(--muted)] hover:text-white transition"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold text-white">Intake</h1>
        </div>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Firm {state.firmId ? state.firmId.slice(0, 8) : 'No firm'} · Role {state.role ?? 'member'}
        </p>

        <div className="mt-6 border-b border-[color:var(--border)] text-sm text-[color:var(--muted)]">
          {[
            { key: 'manual', label: 'Manual intake' },
            { key: 'automatic', label: 'Automatic intake queue' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`mr-6 border-b-2 pb-3 transition ${
                activeTab === tab.key ? 'border-[color:var(--accent-light)] text-white' : 'border-transparent hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {state.loading && <p className="mt-6 text-[color:var(--muted)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--muted)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && (
          <p className="mt-6 text-[color:var(--muted)]">No firm linked yet.</p>
        )}

        {activeTab === 'manual' && state.authed && state.firmId && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {isReadOnly && (
              <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[color:var(--muted)]">
                You have read-only access. Please contact your firm admin to create a case.
              </div>
            )}
            {limitReached && (
              <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[color:var(--muted)]">
                {'reason' in limitCheck ? limitCheck.reason : ''} Upgrade to Pro to add more cases.
                <Link href="/myclient/upgrade" className="ml-2 text-white underline underline-offset-4">
                  Upgrade
                </Link>
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Client Information</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">Who is this case for?</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm text-[color:var(--muted)]">
                    First name *
                    <input
                      value={firstName}
                      onChange={(event) => setFirstName(event.target.value)}
                      disabled={isReadOnly}
                      className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      required
                    />
                    {fieldErrors.firstName && <span className="mt-1 block text-xs text-red-300">{fieldErrors.firstName}</span>}
                  </label>
                  <label className="block text-sm text-[color:var(--muted)]">
                    Last name *
                    <input
                      value={lastName}
                      onChange={(event) => setLastName(event.target.value)}
                      disabled={isReadOnly}
                      className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      required
                    />
                    {fieldErrors.lastName && <span className="mt-1 block text-xs text-red-300">{fieldErrors.lastName}</span>}
                  </label>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">Contact</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-[color:var(--muted)]">
                      Email (optional)
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--muted)]">
                      Phone (optional)
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Matter Details</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">Define the case type and tracking basics.</p>
                </div>
                <label className="block text-sm text-[color:var(--muted)]">
                  Matter type
                  <input
                    value={matterType}
                    onChange={(event) => setMatterType(event.target.value)}
                    disabled={isReadOnly}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="block text-sm text-[color:var(--muted)]">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    disabled={isReadOnly}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-[color:var(--muted)]">
                  Matter title (optional)
                  <input
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    disabled={isReadOnly}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                  <span className="mt-2 block text-xs text-[color:var(--muted-2)]">
                    Default title is generated from client + matter type.
                  </span>
                </label>

                <div>
                  <h3 className="text-sm font-semibold text-white">Jurisdiction</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-[color:var(--muted)]">
                      State (optional)
                      <input
                        value={stateField}
                        onChange={(event) => setStateField(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--muted)]">
                      County (optional)
                      <input
                        value={county}
                        onChange={(event) => setCounty(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--muted)]">
                      Court name (optional)
                      <input
                        value={courtName}
                        onChange={(event) => setCourtName(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--muted)]">
                      Case number (optional)
                      <input
                        value={caseNumber}
                        onChange={(event) => setCaseNumber(event.target.value)}
                        disabled={isReadOnly}
                        className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">Intake Summary</h2>
              <p className="mt-1 text-sm text-[color:var(--muted)]">Capture key details for your team.</p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isReadOnly}
                rows={5}
                placeholder="Enter intake summary here..."
                className="mt-3 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting || isReadOnly || limitReached || caseCountLoading}
                className="rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create Case'}
              </button>
              <p className="text-xs text-[color:var(--muted-2)]">Your data is secured and isolated to your firm.</p>
            </div>
          </form>
        )}

        {activeTab === 'automatic' && state.authed && state.firmId && (
          <div className="mt-8 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Automatic Intake Queue</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Review submitted client intakes and convert them into cases.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadQueue()}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm text-white hover:bg-white/5"
              >
                Refresh queue
              </button>
            </div>

            {queueLoading && <p className="text-sm text-[color:var(--muted)]">Loading intake queue...</p>}
            {queueError && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {queueError}
              </div>
            )}

            {!queueLoading && !queueError && intakeQueue.length === 0 && (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-0)] p-6 text-sm text-[color:var(--muted)]">
                No submitted intakes yet.
              </div>
            )}

            {!queueLoading && intakeQueue.length > 0 && (
              <div className="space-y-4">
                {intakeQueue.map((item) => {
                  const clientName = formatIntakeClient(item.raw_payload);
                  const subtitle = formatIntakeSubtitle(item);
                  const submittedLabel = item.submitted_at
                    ? `Submitted ${new Date(item.submitted_at).toLocaleDateString()}`
                    : 'Draft in progress';
                  const wf4StatusRaw = wf4StatusMap[item.id];
                  const wf4Status = (() => {
                    const status = typeof wf4StatusRaw === 'string' ? wf4StatusRaw.toLowerCase() : '';
                    if (!status) return { label: 'Loading', tone: 'loading' };
                    if (status === 'success' || status === 'completed' || status === 'partial') {
                      return { label: 'Ready', tone: 'ready' };
                    }
                    if (status === 'queued' || status === 'running') {
                      return { label: 'Loading', tone: 'loading' };
                    }
                    return { label: 'Down', tone: 'down' };
                  })();

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-0)] p-5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3 className="text-lg font-semibold text-white">{clientName}</h3>
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{subtitle}</p>
                        <p className="mt-2 text-xs text-[color:var(--muted-2)]">{submittedLabel}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs text-[color:var(--muted)]">
                          {item.status}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${WF4_STATUS_STYLES[wf4Status.tone] ?? WF4_STATUS_STYLES.loading}`}
                        >
                          WF4 {wf4Status.label}
                        </span>
                        <Link
                          href={`/myclient/intake/${item.id}/intake-review`}
                          className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)]"
                        >
                          Review intake
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
