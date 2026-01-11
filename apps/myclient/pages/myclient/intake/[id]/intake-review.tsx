import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canEditCases } from '@/lib/permissions';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../../lib/intake/schema/gaDivorceCustodyV1';
import type { FieldDef, SectionDef } from '../../../../../../lib/intake/schema/types';
import { runConsistencyChecks } from '../../../../../../lib/intake/consistencyChecks';
import { formatLabel, isRepeatableSection } from '../../../../../../lib/intake/validation';

type IntakeRecord = {
  id: string;
  firm_id: string;
  status: string;
  submitted_at: string | null;
  raw_payload: Record<string, unknown>;
  matter_type: string | null;
  urgency_level: string | null;
  intake_channel: string | null;
  language_preference: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AiFlagRow = {
  id: string;
  flag_key: string;
  severity: 'low' | 'medium' | 'high';
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type IntakeDocumentRow = {
  id: string;
  storage_object_path: string;
  document_type: string | null;
  classification: Record<string, unknown> | null;
  created_at: string;
};

type SummaryEntry = {
  index: number;
  fields: Array<{ field: FieldDef; value: unknown }>;
};

type SummarySection =
  | { section: SectionDef; repeatable: true; entries: SummaryEntry[] }
  | { section: SectionDef; repeatable: false; fields: Array<{ field: FieldDef; value: unknown }> };

const SEVERITY_STYLES: Record<string, string> = {
  low: 'border-emerald-400/40 text-emerald-200',
  medium: 'border-amber-400/40 text-amber-200',
  high: 'border-red-400/40 text-red-200',
};

function humanize(value: string) {
  return value
    .replace(/-/g, ' ')
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatStructuredAddress(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '—';
  const record = value as Record<string, unknown>;
  const parts = [
    record.line1,
    record.line2,
    record.city,
    record.state,
    record.zip,
  ]
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .map((entry) => entry.trim());

  return parts.length > 0 ? parts.join(', ') : '—';
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function hasDisplayValue(value: unknown, type: string) {
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number' && !Number.isNaN(value);
  if (type === 'array' || type === 'list') return Array.isArray(value) && value.length > 0;
  if (type === 'multiselect') return Array.isArray(value) && value.length > 0;
  if (type === 'structured') return value !== undefined && value !== null;
  if (type === 'date') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'enum') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'text') return typeof value === 'string' && value.trim().length > 0;
  return value !== undefined && value !== null;
}

function formatFieldValue(value: unknown, type: string) {
  if (!hasDisplayValue(value, type)) return '—';
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'number') return `${value}`;
  if (type === 'date') return typeof value === 'string' ? value : '—';
  if (type === 'structured') return formatStructuredAddress(value);
  if (type === 'enum') return typeof value === 'string' ? humanize(value) : '—';
  if (type === 'multiselect') return toArray(value).map((entry) => (typeof entry === 'string' ? humanize(entry) : '—')).join(', ');
  if (type === 'array' || type === 'list') return toArray(value).map((entry) => `${entry}`).join(', ');
  if (type === 'text') return typeof value === 'string' ? value : '—';
  return `${value}`;
}

export default function IntakeReviewPage() {
  const router = useRouter();
  const { state } = useFirm();
  const [intake, setIntake] = useState<IntakeRecord | null>(null);
  const [flags, setFlags] = useState<AiFlagRow[]>([]);
  const [documents, setDocuments] = useState<IntakeDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepting' | 'rejecting'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const intakeId = useMemo(
    () => (typeof router.query.id === 'string' ? router.query.id : null),
    [router.query.id],
  );

  const canEdit = canEditCases(state.role);

  const loadReview = useCallback(async () => {
    if (!state.authed || !state.firmId || !intakeId) return;
    setLoading(true);
    setError(null);

    const { data: intakeRows, error: intakeError } = await supabase
      .from('intakes')
      .select(
        'id, firm_id, status, submitted_at, raw_payload, matter_type, urgency_level, intake_channel, language_preference, created_at, updated_at',
      )
      .eq('id', intakeId)
      .eq('firm_id', state.firmId)
      .limit(1);

    if (intakeError) {
      setError(intakeError.message);
      setIntake(null);
      setLoading(false);
      return;
    }

    const intakeRow = Array.isArray(intakeRows) && intakeRows.length > 0 ? (intakeRows[0] as IntakeRecord) : null;
    setIntake(intakeRow);

    if (!intakeRow) {
      setLoading(false);
      return;
    }

    const [{ data: flagRows, error: flagError }, { data: documentRows, error: documentError }] = await Promise.all([
      supabase
        .from('ai_flags')
        .select('id, flag_key, severity, summary, details, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('intake_documents')
        .select('id, storage_object_path, document_type, classification, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('created_at', { ascending: false }),
    ]);

    if (flagError) {
      setError(flagError.message);
    } else {
      setFlags((flagRows ?? []) as AiFlagRow[]);
    }

    if (documentError) {
      setError(documentError.message);
    } else {
      setDocuments((documentRows ?? []) as IntakeDocumentRow[]);
    }

    setLoading(false);
  }, [intakeId, state.authed, state.firmId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const payload = intake?.raw_payload ?? {};
  const clientName = useMemo(() => {
    const first = typeof payload.client_first_name === 'string' ? payload.client_first_name.trim() : '';
    const last = typeof payload.client_last_name === 'string' ? payload.client_last_name.trim() : '';
    return [first, last].filter(Boolean).join(' ') || 'Unknown client';
  }, [payload.client_first_name, payload.client_last_name]);

  const summarySections = useMemo<SummarySection[]>(() => {
    return GA_DIVORCE_CUSTODY_V1.sections.map((section) => {
      const repeatable = isRepeatableSection(section.id);
      if (repeatable) {
        const arrays = section.fields.map((field) => ({
          field,
          values: toArray(payload[field.key]),
        }));
        const count = arrays.reduce((max, item) => Math.max(max, item.values.length), 0);
        const entries = Array.from({ length: count }).map((_, index) => ({
          index,
          fields: arrays.map(({ field, values }) => ({
            field,
            value: values[index],
          })),
        }));
        return { section, repeatable: true, entries };
      }

      const fields = section.fields.map((field) => ({
        field,
        value: payload[field.key],
      }));
      return { section, repeatable: false, fields };
    });
  }, [payload]);

  const contradictions = useMemo(() => runConsistencyChecks(payload).warnings, [payload]);

  const ensureLocked = async () => {
    if (!intake || intake.submitted_at) return;
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('intakes')
      .update({ status: 'submitted', submitted_at: now })
      .eq('id', intake.id)
      .eq('firm_id', intake.firm_id)
      .is('submitted_at', null);

    if (updateError) {
      throw updateError;
    }
    setIntake({ ...intake, status: 'submitted', submitted_at: now });
  };

  const handleAccept = async () => {
    if (!intake) return;
    setActionError(null);
    setActionNotice(null);
    setActionStatus('accepting');

    try {
      await ensureLocked();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setActionError(sessionError?.message || 'Please sign in to accept this intake.');
        setActionStatus('idle');
        return;
      }

      const clientFirst = typeof payload.client_first_name === 'string' ? payload.client_first_name : '';
      const clientLast = typeof payload.client_last_name === 'string' ? payload.client_last_name : '';
      const clientEmail = typeof payload.client_email === 'string' ? payload.client_email : '';
      const clientPhone = typeof payload.client_phone === 'string' ? payload.client_phone : '';
      const matterType =
        (typeof intake.matter_type === 'string' && intake.matter_type) ||
        (typeof payload.matter_type === 'string' ? payload.matter_type : 'Divorce');
      const clientAddress = payload.client_address as Record<string, unknown> | undefined;
      const stateValue = clientAddress && typeof clientAddress.state === 'string' ? clientAddress.state : '';
      const countyValue =
        typeof payload.county_of_filing === 'string'
          ? payload.county_of_filing
          : typeof payload.client_county === 'string'
            ? payload.client_county
            : '';
      const notes = `Accepted intake ${intake.id} from ${clientName}.`;

      const res = await fetch('/api/myclient/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          client_first_name: clientFirst,
          client_last_name: clientLast,
          client_email: clientEmail,
          client_phone: clientPhone,
          matter_type: matterType,
          status: 'open',
          state: stateValue,
          county: countyValue,
          internal_notes: notes,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setActionError(data.error || 'Unable to accept intake.');
        setActionStatus('idle');
        return;
      }

      setActionStatus('idle');
      router.push(`/myclient/cases/${data.caseId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to accept intake.');
      setActionStatus('idle');
    }
  };

  const handleReject = async () => {
    if (!intake) return;
    setActionError(null);
    setActionNotice(null);
    setActionStatus('rejecting');

    try {
      await ensureLocked();
      setActionNotice('Marked as rejected. No case was created.');
      setActionStatus('idle');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reject intake.');
      setActionStatus('idle');
    }
  };

  return (
    <>
      <Head>
        <title>MyClient | Intake Review</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-6 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/myclient/intake" className="text-sm text-[color:var(--muted)] hover:text-white">
              ← Back to intake
            </Link>
            <h1 className="mt-2 text-3xl font-semibold text-white">Intake Review</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{clientName}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleReject}
              disabled={!canEdit || actionStatus !== 'idle'}
              className="rounded-lg border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            >
              {actionStatus === 'rejecting' ? 'Rejecting…' : 'Reject case'}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!canEdit || actionStatus !== 'idle'}
              className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
            >
              {actionStatus === 'accepting' ? 'Accepting…' : 'Accept case'}
            </button>
          </div>
        </div>

        {actionError && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        )}
        {actionNotice && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {actionNotice}
          </div>
        )}

        {state.loading && <p className="text-[color:var(--muted)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="text-[color:var(--muted)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && (
          <p className="text-[color:var(--muted)]">No firm linked yet.</p>
        )}

        {loading && <p className="text-[color:var(--muted)]">Loading intake...</p>}
        {!loading && !intake && !error && (
          <p className="text-[color:var(--muted)]">Intake not found.</p>
        )}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {intake && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <h3 className="text-sm font-semibold text-white">Intake status</h3>
                <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                  <p>Status: <span className="text-white">{intake.status}</span></p>
                  <p>Submitted: <span className="text-white">{intake.submitted_at ? new Date(intake.submitted_at).toLocaleString() : '—'}</span></p>
                  <p>Created: <span className="text-white">{intake.created_at ? new Date(intake.created_at).toLocaleString() : '—'}</span></p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <h3 className="text-sm font-semibold text-white">Matter</h3>
                <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                  <p>Type: <span className="text-white">{intake.matter_type ?? '—'}</span></p>
                  <p>Urgency: <span className="text-white">{intake.urgency_level ?? '—'}</span></p>
                  <p>Channel: <span className="text-white">{intake.intake_channel ?? '—'}</span></p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <h3 className="text-sm font-semibold text-white">Client</h3>
                <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                  <p>Name: <span className="text-white">{clientName}</span></p>
                  <p>Email: <span className="text-white">{typeof payload.client_email === 'string' ? payload.client_email : '—'}</span></p>
                  <p>Phone: <span className="text-white">{typeof payload.client_phone === 'string' ? payload.client_phone : '—'}</span></p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">Structured Summary</h2>
                  <div className="mt-4 space-y-6">
                    {summarySections.map((section) => (
                      <div key={section.section.id}>
                        <h3 className="text-sm font-semibold text-white">{section.section.title}</h3>
                        {section.repeatable ? (
                          section.entries.length > 0 ? (
                            <div className="mt-3 grid gap-3">
                              {section.entries.map((entry) => (
                                <div key={entry.index} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
                                    Item {entry.index + 1}
                                  </div>
                                  <div className="mt-3 grid gap-2 text-sm text-[color:var(--text-2)]">
                                    {entry.fields.map(({ field, value }) => (
                                      <p key={field.key}>
                                        {formatLabel(field.key)}:{' '}
                                        <span className="text-white">{formatFieldValue(value, field.type)}</span>
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-[color:var(--muted)]">No entries provided.</p>
                          )
                        ) : (
                          <div className="mt-3 grid gap-2 text-sm text-[color:var(--text-2)]">
                            {section.fields
                              .filter((entry) => !entry.field.isSystem)
                              .map(({ field, value }) => (
                                <p key={field.key}>
                                  {formatLabel(field.key)}:{' '}
                                  <span className="text-white">{formatFieldValue(value, field.type)}</span>
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">Documents</h2>
                  {documents.length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">No documents uploaded yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm text-[color:var(--text-2)]">
                      {documents.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-white">{doc.storage_object_path}</div>
                              <div className="text-xs text-[color:var(--muted)]">{doc.document_type ?? 'Uncategorized'}</div>
                            </div>
                            <span className="text-xs text-[color:var(--muted-2)]">
                              {new Date(doc.created_at).toLocaleString()}
                            </span>
                          </div>
                          {doc.classification && Object.keys(doc.classification).length > 0 && (
                            <div className="mt-3 text-xs text-[color:var(--muted)]">
                              Classification: {JSON.stringify(doc.classification)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">AI Risk Flags</h2>
                  {flags.length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">No AI flags generated yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm text-[color:var(--text-2)]">
                      {flags.map((flag) => {
                        const evidenceLinks = Array.isArray(flag.details?.evidence_links)
                          ? (flag.details?.evidence_links as Array<{ label?: string; url?: string } | string>)
                          : [];
                        return (
                          <div key={flag.id} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-white">{flag.summary}</span>
                              <span className={`rounded-full border px-2 py-1 text-xs ${SEVERITY_STYLES[flag.severity] ?? 'border-white/10 text-white'}`}>
                                {humanize(flag.severity)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-[color:var(--muted)]">{humanize(flag.flag_key)}</div>
                            {evidenceLinks.length > 0 && (
                              <div className="mt-3 space-y-1 text-xs text-[color:var(--muted)]">
                                {evidenceLinks.map((link, index) => {
                                  const url = typeof link === 'string' ? link : link.url;
                                  const label = typeof link === 'string' ? `Evidence ${index + 1}` : link.label || url || `Evidence ${index + 1}`;
                                  if (!url) return null;
                                  return (
                                    <a key={`${flag.id}-${index}`} href={url} className="text-white underline underline-offset-4">
                                      {label}
                                    </a>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">Contradictions</h2>
                  {contradictions.length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">No contradictions detected.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                      {contradictions.map((warning) => (
                        <li key={warning.key} className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2">
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
