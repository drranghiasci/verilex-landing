import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

type IntakeRow = {
  id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
  raw_payload: Record<string, unknown> | null;
};

type IntakeDecisionRow = {
  intake_id: string;
  decision: 'accepted' | 'rejected';
  decided_at: string;
};

type ExtractionRow = {
  intake_id: string;
  version: number;
  created_at: string;
  extracted_data: Record<string, unknown> | null;
};

type AiFlagRow = {
  intake_id: string;
  flag_key: string;
  severity: 'low' | 'medium' | 'high';
};

type IntakeDocumentRow = {
  intake_id: string;
  document_type: string | null;
  classification: Record<string, unknown> | null;
};

type RulesEngineResult = {
  blocks?: Array<{ rule_id: string; message: string }>; // field_paths are optional for analytics
  warnings?: Array<{ rule_id: string; message: string }>;
};

type FunnelCounts = {
  draft: number;
  submitted: number;
  reviewReady: number;
  accepted: number;
  rejected: number;
};

type BacklogCounts = {
  blocked: number;
  reviewReady: number;
  accepted: number;
  rejected: number;
};

type MetricState = {
  funnel: FunnelCounts;
  backlog: BacklogCounts;
  medianSubmitToDecisionDays: number | null;
  medianReviewReadyToDecisionDays: number | null;
  ruleBlocks: Array<{ rule_id: string; count: number }>;
  ruleWarnings: Array<{ rule_id: string; count: number }>;
  aiFlags: Array<{ flag_key: string; count: number }>;
  aiSeverity: Array<{ severity: string; count: number }>;
  docCompletionPct: number | null;
  docTypes: Array<{ doc_type: string; count: number }>;
  counties: Array<{ county: string; count: number }>;
};

const EMPTY_METRICS: MetricState = {
  funnel: { draft: 0, submitted: 0, reviewReady: 0, accepted: 0, rejected: 0 },
  backlog: { blocked: 0, reviewReady: 0, accepted: 0, rejected: 0 },
  medianSubmitToDecisionDays: null,
  medianReviewReadyToDecisionDays: null,
  ruleBlocks: [],
  ruleWarnings: [],
  aiFlags: [],
  aiSeverity: [],
  docCompletionPct: null,
  docTypes: [],
  counties: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function toDays(ms: number) {
  return ms / (1000 * 60 * 60 * 24);
}

function formatDays(value: number | null) {
  if (value === null) return '—';
  return `${value.toFixed(1)} days`;
}

function getRulesEngine(row: ExtractionRow): RulesEngineResult | null {
  if (!row.extracted_data || !isRecord(row.extracted_data)) return null;
  const rulesEngine = row.extracted_data.rules_engine;
  if (!isRecord(rulesEngine)) return null;
  return rulesEngine as RulesEngineResult;
}

function pickCounty(payload: Record<string, unknown> | null) {
  if (!payload) return null;
  const filing = typeof payload.county_of_filing === 'string' ? payload.county_of_filing.trim() : '';
  if (filing) return filing;
  const client = typeof payload.client_county === 'string' ? payload.client_county.trim() : '';
  return client || null;
}

export default function AnalyticsPage() {
  const { state } = useFirm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricState>(EMPTY_METRICS);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const startIso = startDate.toISOString();

      const { data: intakeRows, error: intakeError } = await supabase
        .from('intakes')
        .select('id, status, submitted_at, created_at, raw_payload')
        .eq('firm_id', state.firmId)
        .gte('created_at', startIso)
        .order('created_at', { ascending: false });

      if (!mounted) return;

      if (intakeError) {
        setError(intakeError.message);
        setMetrics(EMPTY_METRICS);
        setLoading(false);
        return;
      }

      const intakes = (intakeRows ?? []) as IntakeRow[];
      if (intakes.length === 0) {
        setMetrics(EMPTY_METRICS);
        setLoading(false);
        return;
      }

      const intakeIds = intakes.map((item) => item.id);

      const [decisionsResult, extractionsResult, flagsResult, docsResult] = await Promise.all([
        supabase
          .from('intake_decisions')
          .select('intake_id, decision, decided_at')
          .eq('firm_id', state.firmId)
          .in('intake_id', intakeIds),
        supabase
          .from('intake_extractions')
          .select('intake_id, version, created_at, extracted_data')
          .eq('firm_id', state.firmId)
          .in('intake_id', intakeIds),
        supabase
          .from('ai_flags')
          .select('intake_id, flag_key, severity')
          .eq('firm_id', state.firmId)
          .in('intake_id', intakeIds),
        supabase
          .from('intake_documents')
          .select('intake_id, document_type, classification')
          .eq('firm_id', state.firmId)
          .in('intake_id', intakeIds),
      ]);

      if (!mounted) return;

      if (decisionsResult.error || extractionsResult.error || flagsResult.error || docsResult.error) {
        setError(
          decisionsResult.error?.message ||
          extractionsResult.error?.message ||
          flagsResult.error?.message ||
          docsResult.error?.message ||
          'Unable to load analytics data',
        );
        setMetrics(EMPTY_METRICS);
        setLoading(false);
        return;
      }

      const decisions = (decisionsResult.data ?? []) as IntakeDecisionRow[];
      const extractions = (extractionsResult.data ?? []) as ExtractionRow[];
      const flags = (flagsResult.data ?? []) as AiFlagRow[];
      const docs = (docsResult.data ?? []) as IntakeDocumentRow[];

      const decisionMap: Record<string, IntakeDecisionRow> = {};
      decisions.forEach((row) => {
        const existing = decisionMap[row.intake_id];
        if (!existing || row.decided_at > existing.decided_at) {
          decisionMap[row.intake_id] = row;
        }
      });

      const extractionMap: Record<string, ExtractionRow> = {};
      extractions.forEach((row) => {
        const existing = extractionMap[row.intake_id];
        if (!existing || row.version > existing.version) {
          extractionMap[row.intake_id] = row;
        }
      });

      const funnel: FunnelCounts = {
        draft: intakes.filter((i) => i.status === 'draft').length,
        submitted: intakes.filter((i) => i.status === 'submitted').length,
        reviewReady: 0,
        accepted: decisions.filter((d) => d.decision === 'accepted').length,
        rejected: decisions.filter((d) => d.decision === 'rejected').length,
      };

      const backlog: BacklogCounts = { blocked: 0, reviewReady: 0, accepted: funnel.accepted, rejected: funnel.rejected };

      const submitToDecision: number[] = [];
      const reviewReadyToDecision: number[] = [];
      const ruleBlockCounts: Record<string, number> = {};
      const ruleWarningCounts: Record<string, number> = {};
      const countyCounts: Record<string, number> = {};

      intakes.forEach((intake) => {
        if (intake.status !== 'submitted') return;
        const extraction = extractionMap[intake.id];
        const rulesEngine = extraction ? getRulesEngine(extraction) : null;
        const blocks = rulesEngine?.blocks ?? [];
        const warnings = rulesEngine?.warnings ?? [];
        const hasRules = Boolean(rulesEngine);
        const hasBlocks = hasRules && blocks.length > 0;
        const isReviewReady = hasRules && !hasBlocks;

        if (isReviewReady) {
          funnel.reviewReady += 1;
        }

        const decision = decisionMap[intake.id];
        if (!decision) {
          if (isReviewReady) {
            backlog.reviewReady += 1;
          } else {
            backlog.blocked += 1;
          }
        }

        blocks.forEach((block) => {
          if (!block.rule_id) return;
          ruleBlockCounts[block.rule_id] = (ruleBlockCounts[block.rule_id] ?? 0) + 1;
        });

        warnings.forEach((warning) => {
          if (!warning.rule_id) return;
          ruleWarningCounts[warning.rule_id] = (ruleWarningCounts[warning.rule_id] ?? 0) + 1;
        });

        if (intake.submitted_at && decision?.decided_at) {
          submitToDecision.push(toDays(new Date(decision.decided_at).getTime() - new Date(intake.submitted_at).getTime()));
        }

        if (isReviewReady && decision?.decided_at && extraction?.created_at) {
          reviewReadyToDecision.push(toDays(new Date(decision.decided_at).getTime() - new Date(extraction.created_at).getTime()));
        }

        const county = pickCounty(intake.raw_payload);
        if (county) {
          countyCounts[county] = (countyCounts[county] ?? 0) + 1;
        }
      });

      const aiFlagCounts: Record<string, number> = {};
      const aiSeverityCounts: Record<string, number> = {};
      flags.forEach((flag) => {
        aiFlagCounts[flag.flag_key] = (aiFlagCounts[flag.flag_key] ?? 0) + 1;
        aiSeverityCounts[flag.severity] = (aiSeverityCounts[flag.severity] ?? 0) + 1;
      });

      const docIntakeSet = new Set(docs.map((doc) => doc.intake_id));
      const submittedCount = funnel.submitted;
      const docCompletionPct = submittedCount > 0 ? (docIntakeSet.size / submittedCount) * 100 : null;
      const docTypeCounts: Record<string, number> = {};
      docs.forEach((doc) => {
        const wf4Type =
          isRecord(doc.classification) && isRecord(doc.classification.wf4) && typeof doc.classification.wf4.document_type === 'string'
            ? doc.classification.wf4.document_type
            : null;
        const docType = wf4Type || doc.document_type || 'unknown';
        docTypeCounts[docType] = (docTypeCounts[docType] ?? 0) + 1;
      });

      const buildTopList = (counts: Record<string, number>, limit = 6) =>
        Object.entries(counts)
          .map(([key, count]) => ({ key, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);

      const nextMetrics: MetricState = {
        funnel,
        backlog,
        medianSubmitToDecisionDays: median(submitToDecision),
        medianReviewReadyToDecisionDays: median(reviewReadyToDecision),
        ruleBlocks: buildTopList(ruleBlockCounts, 8).map((entry) => ({ rule_id: entry.key, count: entry.count })),
        ruleWarnings: buildTopList(ruleWarningCounts, 8).map((entry) => ({ rule_id: entry.key, count: entry.count })),
        aiFlags: buildTopList(aiFlagCounts, 8).map((entry) => ({ flag_key: entry.key, count: entry.count })),
        aiSeverity: buildTopList(aiSeverityCounts, 3).map((entry) => ({ severity: entry.key, count: entry.count })),
        docCompletionPct,
        docTypes: buildTopList(docTypeCounts, 6).map((entry) => ({ doc_type: entry.key, count: entry.count })),
        counties: buildTopList(countyCounts, 10).map((entry) => ({ county: entry.key, count: entry.count })),
      };

      setMetrics(nextMetrics);
      setLoading(false);
    };

    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId]);

  const funnelRows = useMemo(
    () => [
      { label: 'Draft Started', value: metrics.funnel.draft },
      { label: 'Submitted', value: metrics.funnel.submitted },
      { label: 'Review-Ready', value: metrics.funnel.reviewReady },
      { label: 'Accepted', value: metrics.funnel.accepted },
      { label: 'Rejected', value: metrics.funnel.rejected },
    ],
    [metrics.funnel],
  );

  return (
    <>
      <Head>
        <title>MyClient | Analytics</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-2">
          <Link href="/myclient/app" className="text-sm text-[color:var(--muted)] hover:text-white">
            ← Back to dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-[color:var(--text)]">Analytics</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Firm-scoped insights for intake performance and document completion.
          </p>
        </div>

        {!state.authed && <p className="text-sm text-[color:var(--muted)]">Please sign in to view analytics.</p>}
        {state.authed && !state.firmId && (
          <p className="text-sm text-[color:var(--muted)]">No firm linked yet.</p>
        )}

        {loading && <p className="text-sm text-[color:var(--muted)]">Loading analytics...</p>}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && state.authed && state.firmId && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Funnel Summary</h2>
              <div className="mt-4 grid gap-3">
                {funnelRows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm">
                    <span className="text-[color:var(--muted)]">{row.label}</span>
                    <span className="text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Operational KPIs</h2>
              <div className="mt-4 space-y-3 text-sm text-[color:var(--text-2)]">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                  <span>Median submit → decision</span>
                  <span className="text-white">{formatDays(metrics.medianSubmitToDecisionDays)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                  <span>Median review-ready → decision</span>
                  <span className="text-white">{formatDays(metrics.medianReviewReadyToDecisionDays)}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Backlog</div>
                  {[
                    { label: 'Submitted & blocked', value: metrics.backlog.blocked },
                    { label: 'Submitted & review-ready', value: metrics.backlog.reviewReady },
                    { label: 'Accepted', value: metrics.backlog.accepted },
                    { label: 'Rejected', value: metrics.backlog.rejected },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm">
                      <span className="text-[color:var(--muted)]">{item.label}</span>
                      <span className="text-white">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Rules Blocks & Warnings</h2>
              <div className="mt-4 grid gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Top blocks</div>
                  {metrics.ruleBlocks.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No blocks recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {metrics.ruleBlocks.map((item) => (
                        <li key={item.rule_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                          <span className="text-[color:var(--muted)]">{item.rule_id}</span>
                          <span className="text-white">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Top warnings</div>
                  {metrics.ruleWarnings.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No warnings recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {metrics.ruleWarnings.map((item) => (
                        <li key={item.rule_id} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                          <span className="text-[color:var(--muted)]">{item.rule_id}</span>
                          <span className="text-white">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Case Integrity Observations</h2>
              <div className="mt-4 grid gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">By severity</div>
                  {metrics.aiSeverity.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No AI flags recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {metrics.aiSeverity.map((item) => (
                        <li key={item.severity} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                          <span className="text-[color:var(--muted)]">{item.severity}</span>
                          <span className="text-white">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Top flag types</div>
                  {metrics.aiFlags.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No AI flags recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {metrics.aiFlags.map((item) => (
                        <li key={item.flag_key} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                          <span className="text-[color:var(--muted)]">{item.flag_key}</span>
                          <span className="text-white">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Documents</h2>
              <div className="mt-4 space-y-3 text-sm text-[color:var(--text-2)]">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                  <span>Intakes with documents</span>
                  <span className="text-white">
                    {metrics.docCompletionPct === null ? '—' : `${metrics.docCompletionPct.toFixed(0)}%`}
                  </span>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-[color:var(--muted)]">Top document types</div>
                  {metrics.docTypes.length === 0 ? (
                    <p className="mt-2 text-sm text-[color:var(--muted)]">No document types recorded.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {metrics.docTypes.map((item) => (
                        <li key={item.doc_type} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                          <span className="text-[color:var(--muted)]">{item.doc_type}</span>
                          <span className="text-white">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">County Breakdown</h2>
              {metrics.counties.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">No county data available.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {metrics.counties.map((item) => (
                    <li key={item.county} className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2">
                      <span className="text-[color:var(--muted)]">{item.county}</span>
                      <span className="text-white">{item.count}</span>
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
