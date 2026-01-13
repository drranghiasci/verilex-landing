import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canEditCases } from '@/lib/permissions';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../../lib/intake/schema/gaDivorceCustodyV1';
import type { FieldDef, SectionDef } from '../../../../../../lib/intake/schema/types';
import type { InconsistencyItem, ReviewAttention, RunOutput } from '../../../../../../src/workflows/wf4/types';
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
  is_acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
};

type AiRunRow = {
  id: string;
  status: string;
  model_name: string | null;
  outputs: Record<string, unknown> | null;
  created_at: string;
};

type IntakeDocumentRow = {
  id: string;
  storage_object_path: string;
  document_type: string | null;
  classification: Record<string, unknown> | null;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by_role: string | null;
  created_at: string;
};

type IntakeDecisionRow = {
  id: string;
  decision: 'accepted' | 'rejected';
  case_id: string | null;
  reason?: string | null;
  decided_at: string;
};

type RulesEngineResult = {
  ruleset_version?: string;
  required_fields_missing?: string[];
  blocks?: Array<{ rule_id: string; message: string; field_paths: string[] }>;
  warnings?: Array<{ rule_id: string; message: string; field_paths: string[] }>;
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

const WF4_STATUS_STYLES: Record<string, string> = {
  complete: 'border-emerald-400/40 text-emerald-200',
  partial: 'border-amber-400/40 text-amber-200',
  failed: 'border-red-400/40 text-red-200',
  running: 'border-sky-400/40 text-sky-200',
  queued: 'border-sky-400/40 text-sky-200',
  not_run: 'border-white/10 text-[color:var(--muted)]',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function humanize(value: string) {
  return value
    .replace(/-/g, ' ')
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function filenameFromPath(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
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
  const [wf4Run, setWf4Run] = useState<AiRunRow | null>(null);
  const [wf4Output, setWf4Output] = useState<RunOutput | null>(null);
  const [wf3Rules, setWf3Rules] = useState<RulesEngineResult | null>(null);
  const [wf3ResolveStatus, setWf3ResolveStatus] = useState<'idle' | 'resolving'>('idle');
  const [wf3ResolveError, setWf3ResolveError] = useState<string | null>(null);
  const [wf3ResolveNotice, setWf3ResolveNotice] = useState<string | null>(null);
  const [documents, setDocuments] = useState<IntakeDocumentRow[]>([]);
  const [decision, setDecision] = useState<IntakeDecisionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<'idle' | 'accepting' | 'rejecting'>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [ackError, setAckError] = useState<string | null>(null);

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

    const [
      { data: flagRows, error: flagError },
      { data: documentRows, error: documentError },
      { data: runRows, error: runError },
      { data: wf3Rows, error: wf3Error },
      { data: decisionRows, error: decisionError },
    ] = await Promise.all([
      supabase
        .from('ai_flags')
        .select('id, flag_key, severity, summary, details, is_acknowledged, acknowledged_at, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('intake_documents')
        .select('id, storage_object_path, document_type, classification, mime_type, size_bytes, uploaded_by_role, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_runs')
        .select('id, status, model_name, outputs, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .eq('run_kind', 'wf4')
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('intake_extractions')
        .select('extracted_data, version, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('version', { ascending: false })
        .limit(1),
      supabase
        .from('intake_decisions')
        .select('id, decision, case_id, reason, decided_at, created_at')
        .eq('intake_id', intakeRow.id)
        .eq('firm_id', intakeRow.firm_id)
        .order('created_at', { ascending: false })
        .limit(1),
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

    if (runError) {
      setError(runError.message);
    } else {
      const latestRun = Array.isArray(runRows) && runRows.length > 0 ? (runRows[0] as AiRunRow) : null;
      setWf4Run(latestRun);
      if (latestRun && isRecord(latestRun.outputs) && isRecord(latestRun.outputs.run_output)) {
        setWf4Output(latestRun.outputs.run_output as RunOutput);
      } else {
        setWf4Output(null);
      }
    }

    if (wf3Error) {
      setError(wf3Error.message);
    } else {
      const wf3Row = Array.isArray(wf3Rows) && wf3Rows.length > 0 ? wf3Rows[0] : null;
      const extracted = wf3Row && isRecord(wf3Row.extracted_data) ? wf3Row.extracted_data : null;
      const rulesEngine = extracted && isRecord(extracted.rules_engine) ? extracted.rules_engine : null;
      setWf3Rules(rulesEngine as RulesEngineResult | null);
    }

    if (decisionError) {
      setError(decisionError.message);
    } else {
      const decisionRow =
        Array.isArray(decisionRows) && decisionRows.length > 0 ? (decisionRows[0] as IntakeDecisionRow) : null;
      setDecision(decisionRow);
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
  const wf3Blocks = wf3Rules?.blocks ?? [];
  const wf3Warnings = wf3Rules?.warnings ?? [];
  const wf3Missing = wf3Rules?.required_fields_missing ?? [];
  const hasBlocks = wf3Blocks.length > 0;

  const wf4Extractions = wf4Output?.extractions?.extractions ?? [];
  const wf4Inconsistencies: InconsistencyItem[] = wf4Output?.inconsistencies?.inconsistencies ?? [];
  const wf4ReviewAttention: ReviewAttention | null = wf4Output?.review_attention?.review_attention ?? null;
  const reviewReady = Boolean(wf3Rules) && !hasBlocks;

  const wf4Status = useMemo(() => {
    if (!wf4Run) {
      return { label: 'Not run', tone: 'not_run' };
    }
    const status = wf4Run.status?.toLowerCase?.() ?? '';
    if (status === 'success' || status === 'completed') {
      return { label: 'Complete', tone: 'complete' };
    }
    if (status === 'partial') {
      return { label: 'Partial', tone: 'partial' };
    }
    if (status === 'fail' || status === 'failed') {
      return { label: 'Failed', tone: 'failed' };
    }
    if (status === 'running') {
      return { label: 'Running', tone: 'running' };
    }
    if (status === 'queued') {
      return { label: 'Queued', tone: 'queued' };
    }
    return { label: status || 'Unknown', tone: 'not_run' };
  }, [wf4Run]);

  const ensureLocked = async () => {
    if (!intake || intake.submitted_at) return;
    throw new Error('Intake is not submitted.');
  };

  const handleAcknowledgeFlag = async (flagId: string) => {
    setAckError(null);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setAckError('Please sign in to acknowledge flags.');
      return;
    }

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('ai_flags')
      .update({
        is_acknowledged: true,
        acknowledged_by: userData.user.id,
        acknowledged_at: now,
      })
      .eq('id', flagId)
      .eq('firm_id', state.firmId);

    if (updateError) {
      setAckError(updateError.message);
      return;
    }

    setFlags((prev) =>
      prev.map((flag) =>
        flag.id === flagId
          ? { ...flag, is_acknowledged: true, acknowledged_at: now }
          : flag,
      ),
    );
  };

  const handleResolveWf3 = async () => {
    if (!intake) return;
    if (!canEdit) {
      setWf3ResolveError("You don't have permission to resolve WF3 blocks.");
      return;
    }
    setWf3ResolveError(null);
    setWf3ResolveNotice(null);
    setWf3ResolveStatus('resolving');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setWf3ResolveError(sessionError?.message || 'Please sign in to resolve WF3 blocks.');
        setWf3ResolveStatus('idle');
        return;
      }

      const res = await fetch('/api/myclient/intake/resolve-wf3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ intakeId: intake.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setWf3ResolveError(data.error || 'Unable to resolve WF3 blocks.');
        setWf3ResolveStatus('idle');
        return;
      }

      if (data.evaluation && typeof data.evaluation === 'object') {
        setWf3Rules(data.evaluation as RulesEngineResult);
      }
      setWf3ResolveNotice('WF3 rules re-run. Blocks refreshed.');
      setWf3ResolveStatus('idle');
    } catch (err) {
      setWf3ResolveError(err instanceof Error ? err.message : 'Unable to resolve WF3 blocks.');
      setWf3ResolveStatus('idle');
    }
  };

  const handleAccept = async () => {
    if (!intake) return;
    if (hasBlocks) {
      setActionError('Resolve WF3 blocks before accepting.');
      return;
    }
    if (!wf3Rules) {
      setActionError('WF3 rules output is unavailable.');
      return;
    }
    if (decision) {
      setActionError('This intake has already been decided.');
      return;
    }
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

      const decisionRes = await fetch('/api/myclient/intake/decide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          intakeId: intake.id,
          decision: 'accepted',
          caseId: data.caseId,
        }),
      });

      if (!decisionRes.ok) {
        const decisionData = await decisionRes.json().catch(() => ({}));
        setActionError(decisionData.error || 'Unable to record intake decision.');
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
    if (decision) {
      setActionError('This intake has already been decided.');
      return;
    }
    if (!rejectReason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }
    setActionError(null);
    setActionNotice(null);
    setActionStatus('rejecting');

    try {
      await ensureLocked();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setActionError(sessionError?.message || 'Please sign in to reject this intake.');
        setActionStatus('idle');
        return;
      }

      const decisionRes = await fetch('/api/myclient/intake/decide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          intakeId: intake.id,
          decision: 'rejected',
          reason: rejectReason.trim(),
        }),
      });

      const decisionData = await decisionRes.json().catch(() => ({}));
      if (!decisionRes.ok || !decisionData.ok) {
        setActionError(decisionData.error || 'Unable to reject intake.');
        setActionStatus('idle');
        return;
      }

      setDecision(decisionData.decision ?? null);
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
              disabled={!canEdit || actionStatus !== 'idle' || Boolean(decision)}
              className="rounded-lg border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-60"
            >
              {actionStatus === 'rejecting' ? 'Rejecting…' : 'Reject case'}
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={!canEdit || actionStatus !== 'idle' || !reviewReady || Boolean(decision)}
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
        {ackError && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {ackError}
          </div>
        )}
        {wf3ResolveError && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {wf3ResolveError}
          </div>
        )}
        {wf3ResolveNotice && (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {wf3ResolveNotice}
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
            {hasBlocks && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                Not Review-Ready (Rules Blocked). Resolve WF3 blocks before accepting.
              </div>
            )}
            {!wf3Rules && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                WF3 rules output unavailable. Accept is disabled until rules are present.
              </div>
            )}
            {decision && (
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Intake decision recorded: {decision.decision}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <h3 className="text-sm font-semibold text-white">Intake status</h3>
                <div className="mt-3 space-y-2 text-sm text-[color:var(--text-2)]">
                  <p>Status: <span className="text-white">{intake.status}</span></p>
                  <p>Submitted: <span className="text-white">{intake.submitted_at ? new Date(intake.submitted_at).toLocaleString() : '—'}</span></p>
                  <p>Created: <span className="text-white">{intake.created_at ? new Date(intake.created_at).toLocaleString() : '—'}</span></p>
                  <p className="flex items-center gap-2">
                    WF4 status:
                    <span className={`rounded-full border px-2 py-0.5 text-xs ${WF4_STATUS_STYLES[wf4Status.tone] ?? WF4_STATUS_STYLES.not_run}`}>
                      {wf4Status.label}
                    </span>
                  </p>
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold text-white">WF3 Rules</h2>
                    {wf3Rules && hasBlocks && (
                      <button
                        type="button"
                        onClick={handleResolveWf3}
                        disabled={!canEdit || wf3ResolveStatus !== 'idle'}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/10 disabled:opacity-60"
                      >
                        {wf3ResolveStatus === 'resolving' ? 'Resolving…' : 'Resolve WF3 blocks'}
                      </button>
                    )}
                  </div>
                  {!wf3Rules && (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">Rules output unavailable.</p>
                  )}
                  {wf3Rules && (
                    <div className="mt-4 space-y-4 text-sm text-[color:var(--text-2)]">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Blocks</h3>
                        {wf3Blocks.length === 0 ? (
                          <p className="mt-2 text-sm text-[color:var(--muted)]">No blocks.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {wf3Blocks.map((block) => (
                              <li key={block.rule_id} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-100">
                                <div className="text-xs uppercase tracking-wide text-red-200">{block.rule_id}</div>
                                <div className="mt-1">{block.message}</div>
                                {Array.isArray(block.field_paths) && block.field_paths.length > 0 && (
                                  <div className="mt-2 text-xs text-red-200/80">
                                    {block.field_paths.join(', ')}
                                  </div>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-white">Warnings</h3>
                        {wf3Warnings.length === 0 ? (
                          <p className="mt-2 text-sm text-[color:var(--muted)]">No warnings.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {wf3Warnings.map((warning) => (
                              <li key={warning.rule_id} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                                <div className="text-xs uppercase tracking-wide text-amber-200">{warning.rule_id}</div>
                                <div className="mt-1">{warning.message}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-white">Missing Required Fields</h3>
                        {wf3Missing.length === 0 ? (
                          <p className="mt-2 text-sm text-[color:var(--muted)]">All required fields present.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {wf3Missing.map((path) => (
                              <li key={path} className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2">
                                {path}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">Documents</h2>
                  {documents.length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">No documents uploaded yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm text-[color:var(--text-2)]">
                      {documents.map((doc) => (
                        <div key={doc.id} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                          {(() => {
                            const wf4Classification =
                              isRecord(doc.classification) && isRecord(doc.classification.wf4)
                                ? doc.classification.wf4
                                : null;
                            const classificationType =
                              wf4Classification && typeof wf4Classification.document_type === 'string'
                                ? wf4Classification.document_type
                                : null;
                            const classificationConfidence =
                              wf4Classification && typeof wf4Classification.confidence_level === 'string'
                                ? wf4Classification.confidence_level
                                : null;
                            return (
                              <>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-white">{filenameFromPath(doc.storage_object_path)}</div>
                              <div className="text-xs text-[color:var(--muted)]">{doc.document_type ?? 'Uncategorized'}</div>
                            </div>
                            <span className="text-xs text-[color:var(--muted-2)]">
                              {new Date(doc.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-[color:var(--muted)]">
                            {doc.uploaded_by_role ? `Uploaded by ${doc.uploaded_by_role}` : 'Uploaded'}
                            {doc.mime_type ? ` • ${doc.mime_type}` : ''}
                            {typeof doc.size_bytes === 'number' ? ` • ${Math.round(doc.size_bytes / 1024)} KB` : ''}
                          </div>
                          {classificationType && (
                            <div className="mt-3 text-xs text-[color:var(--muted)]">
                              Classification: {classificationType} ({classificationConfidence ?? '—'})
                            </div>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">WF4 AI Output</h2>
                  {!wf4Output && (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">AI output unavailable.</p>
                  )}
                  {wf4Output && (
                    <div className="mt-3 space-y-4 text-sm text-[color:var(--text-2)]">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Extraction Summary</h3>
                        {wf4Extractions.length === 0 ? (
                          <p className="mt-2 text-sm text-[color:var(--muted)]">No extractions available.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {wf4Extractions.slice(0, 8).map((item) => (
                              <li key={item.field_key} className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2">
                                <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{item.field_key}</div>
                                <div className="mt-1 text-white">{item.value !== null && item.value !== undefined ? `${item.value}` : '—'}</div>
                                <div className="text-xs text-[color:var(--muted)]">{item.confidence_level}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">AI Contradictions</h3>
                        {wf4Inconsistencies.length === 0 ? (
                          <p className="mt-2 text-sm text-[color:var(--muted)]">No contradictions reported.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {wf4Inconsistencies.map((item) => (
                              <li key={item.inconsistency_key} className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2">
                                <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">{item.severity}</div>
                                <div className="mt-1 text-white">{item.summary}</div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {wf4ReviewAttention && (
                        <div>
                          <h3 className="text-sm font-semibold text-white">Reviewer Checklist</h3>
                          <div className="mt-2 space-y-2">
                            {wf4ReviewAttention.high_priority_items.map((item, index) => (
                              <div key={`high-${index}`} className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-100">
                                {item.item}
                              </div>
                            ))}
                            {wf4ReviewAttention.medium_priority_items.map((item, index) => (
                              <div key={`med-${index}`} className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-100">
                                {item.item}
                              </div>
                            ))}
                            {wf4ReviewAttention.low_priority_items.map((item, index) => (
                              <div key={`low-${index}`} className="rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-[color:var(--text-2)]">
                                {item.item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">AI Risk Flags</h2>
                  {flags.length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--muted)]">No AI flags generated yet.</p>
                  ) : (
                    <div className="mt-3 space-y-3 text-sm text-[color:var(--text-2)]">
                      {flags.map((flag) => {
                        const detailRecord = isRecord(flag.details) ? flag.details : {};
                        const flagPayload = isRecord(detailRecord.flag) ? detailRecord.flag : null;
                        const evidence = Array.isArray(flagPayload?.evidence) ? flagPayload?.evidence : [];
                        return (
                          <div key={flag.id} className="rounded-xl border border-white/10 bg-[var(--surface-1)] p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-white">{flag.summary}</span>
                              <span className={`rounded-full border px-2 py-1 text-xs ${SEVERITY_STYLES[flag.severity] ?? 'border-white/10 text-white'}`}>
                                {humanize(flag.severity)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-[color:var(--muted)]">{humanize(flag.flag_key)}</div>
                            {evidence.length > 0 && (
                              <div className="mt-3 space-y-1 text-xs text-[color:var(--muted)]">
                                {evidence.map((item, index) => (
                                  <div key={`${flag.id}-evidence-${index}`} className="rounded border border-white/10 px-2 py-1">
                                    {item.source_type}:{item.source_id} • {item.path_or_span}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-xs text-[color:var(--muted)]">
                                {flag.is_acknowledged
                                  ? `Acknowledged ${flag.acknowledged_at ? new Date(flag.acknowledged_at).toLocaleString() : ''}`
                                  : 'Not acknowledged'}
                              </span>
                              {!flag.is_acknowledged && (
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledgeFlag(flag.id)}
                                  className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white hover:bg-white/10"
                                >
                                  Acknowledge
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                  <h2 className="text-lg font-semibold text-white">WF2 Consistency Checks</h2>
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
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
              <h2 className="text-lg font-semibold text-white">Decision Notes</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                Rejection requires a short reason. Accept uses the intake summary to create a case.
              </p>
              <div className="mt-4">
                <label className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Rejection reason</label>
                <textarea
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm text-white"
                  rows={3}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Why is this intake rejected?"
                  disabled={Boolean(decision)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
