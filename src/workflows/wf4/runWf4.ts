import crypto from 'crypto';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../lib/intake/schema/gaDivorceCustodyV1';
import { loadWf4Counties } from './counties';
import { loadWf4TaskCatalog } from './taskCatalog';
import { validateEvidencePointers } from './evidence';
import {
  WF4_PROMPT_BUNDLE_VERSION,
  WF4_PROMPT_IDS,
  WF4_PROMPT_TEMPLATES,
  WF4_TASK_PROMPT_MAP,
} from './prompts';
import type {
  CountyMention,
  DocumentClassification,
  ExtractionItem,
  FlagItem,
  InconsistencyItem,
  IntakeSnapshot,
  LlmProvider,
  ReviewAttention,
  RunLog,
  RunOutput,
  RunWf4Dependencies,
  RunWf4Input,
  TaskResult,
  Wf3Snapshot,
} from './types';

type TaskValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

type TaskContext = {
  intakeSnapshot: IntakeSnapshot;
  wf3Snapshot: Wf3Snapshot;
  schemaAllowlist: string[];
  countyReference: string[];
  previousOutputs: RunOutput;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toIso(now?: () => string) {
  return now ? now() : new Date().toISOString();
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(',')}}`;
}

function hashValue(value: unknown) {
  const payload = stableStringify(value);
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function buildSchemaAllowlist() {
  return GA_DIVORCE_CUSTODY_V1.sections.flatMap((section) =>
    section.fields.filter((field) => !field.isSystem).map((field) => field.key),
  );
}

async function loadIntakeSnapshot(intakeId: string): Promise<IntakeSnapshot> {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { data: intake, error: intakeError } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, submitted_at, raw_payload, created_at')
    .eq('id', intakeId)
    .maybeSingle();

  if (intakeError) {
    throw new Error('Unable to load intake snapshot');
  }
  if (!intake) {
    throw new Error('Intake not found');
  }
  if (!intake.submitted_at) {
    throw new Error('Intake not submitted');
  }

  const { data: messages, error: messageError } = await supabaseAdmin
    .from('intake_messages')
    .select('id, source, content, created_at')
    .eq('intake_id', intakeId)
    .order('seq', { ascending: true });

  if (messageError) {
    throw new Error('Unable to load intake messages');
  }

  const { data: documents, error: documentsError } = await supabaseAdmin
    .from('intake_documents')
    .select('id, storage_object_path, document_type, created_at')
    .eq('intake_id', intakeId)
    .order('created_at', { ascending: true });

  if (documentsError) {
    throw new Error('Unable to load intake documents');
  }

  const structuredFields = isRecord(intake.raw_payload) ? intake.raw_payload : {};

  return {
    intake_id: intake.id,
    submission_id: intake.id,
    structured_fields: structuredFields,
    free_text_fields: {},
    messages: (messages ?? []).map(
      (message: { id: string; source: string; content: string; created_at: string }) => ({
        message_id: message.id,
        role: message.source,
        content: message.content,
        created_at: message.created_at,
      }),
    ),
    documents: (documents ?? []).map(
      (doc: { id: string; storage_object_path: string | null; document_type: string | null; created_at: string }) => ({
        document_id: doc.id,
        filename: doc.storage_object_path ?? null,
        mimetype: doc.document_type ?? null,
        text_extract: null,
        created_at: doc.created_at,
      }),
    ),
    created_at: intake.created_at,
    firm_id: intake.firm_id,
  };
}

async function loadWf3Snapshot(wf3RunId: string): Promise<Wf3Snapshot> {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { data, error } = await supabaseAdmin
    .from('intake_extractions')
    .select('id, extracted_data, created_at')
    .eq('id', wf3RunId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load WF3 snapshot');
  }
  if (!data) {
    throw new Error('WF3 snapshot not found');
  }

  const extracted = data.extracted_data as { rules_engine?: any } | null;
  const rulesEngine = extracted?.rules_engine ?? null;
  if (!rulesEngine) {
    throw new Error('WF3 snapshot missing rules_engine');
  }

  return {
    wf3_run_id: data.id,
    validation_summary: {
      rule_results: (rulesEngine.rule_evaluations ?? []).map((entry: any) => ({
        rule_id: String(entry.rule_id ?? ''),
        passed: Boolean(entry.passed),
        field_paths: Array.isArray(entry.field_paths) ? entry.field_paths : [],
        message: entry.message ?? undefined,
      })),
      required_fields_missing: Array.isArray(rulesEngine.required_fields_missing)
        ? rulesEngine.required_fields_missing
        : [],
    },
    canonical_fields: {},
    created_at: data.created_at,
  };
}

async function storeRun(args: { runLog: RunLog; runOutput: RunOutput }) {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { runLog, runOutput } = args;
  const { data, error } = await supabaseAdmin
    .from('ai_runs')
    .insert({
      id: runLog.wf4_run_id,
      firm_id: runLog.input_refs.firm_id,
      intake_id: runLog.intake_id,
      run_kind: 'wf4',
      model_name: runLog.model_name ?? null,
      prompt_hash: runLog.prompt_hash ?? runLog.prompt_bundle_version,
      inputs: {
        wf3_run_id: runLog.wf3_run_id ?? null,
        prompt_bundle_version: runLog.prompt_bundle_version,
        prompt_hash: runLog.prompt_hash ?? null,
        input_hash: runLog.input_hash ?? null,
        per_task: runLog.per_task,
        input_refs: runLog.input_refs,
        usage: runLog.usage ?? null,
        cost_usd: typeof runLog.cost_usd === 'number' ? runLog.cost_usd : null,
        started_at: runLog.started_at,
        completed_at: runLog.completed_at,
        status: runLog.status,
      },
      outputs: {
        run_log: runLog,
        run_output: runOutput,
      },
      status: runLog.status.toLowerCase(),
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Unable to store WF4 run');
  }

  return { wf4_run_id: data.id };
}

async function findExistingRun(args: { intakeId: string; inputHash: string }) {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { intakeId, inputHash } = args;
  const { data, error } = await supabaseAdmin
    .from('ai_runs')
    .select('outputs')
    .eq('run_kind', 'wf4')
    .eq('intake_id', intakeId)
    .contains('inputs', { input_hash: inputHash })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const outputs = data.outputs as { run_log?: RunLog; run_output?: RunOutput } | null;
  if (!outputs?.run_log || !outputs?.run_output) {
    return null;
  }

  return { runLog: outputs.run_log, runOutput: outputs.run_output };
}

function mapSeverity(level: string): 'low' | 'medium' | 'high' {
  if (level === 'HIGH') return 'high';
  if (level === 'MED') return 'medium';
  return 'low';
}

async function storeFlags(args: { runLog: RunLog; runOutput: RunOutput }) {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { runLog, runOutput } = args;
  const firmId = runLog.input_refs.firm_id;
  if (!firmId) return;

  const rows: Array<Record<string, unknown>> = [];
  const addFlags = (taskId: string, flags?: { flags: FlagItem[] }) => {
    if (!flags?.flags) return;
    flags.flags.forEach((flag) => {
      if (!flag.flag_present) return;
      rows.push({
        firm_id: firmId,
        intake_id: runLog.intake_id,
        ai_run_id: runLog.wf4_run_id,
        flag_key: flag.flag_key,
        severity: mapSeverity(flag.confidence_level),
        summary: flag.why_it_matters_for_review,
        details: {
          task_id: taskId,
          prompt_id: runLog.per_task[taskId]?.prompt_id ?? null,
          flag,
        },
      });
    });
  };

  addFlags('wf4.flags.dv_indicators.v1', runOutput.flags?.dv_indicators);
  addFlags('wf4.flags.jurisdiction_complexity.v1', runOutput.flags?.jurisdiction_complexity);
  addFlags('wf4.flags.custody_conflict.v1', runOutput.flags?.custody_conflict);

  if (rows.length === 0) return;

  const { error } = await supabaseAdmin.from('ai_flags').insert(rows);
  if (error) {
    throw new Error('Unable to store WF4 flags');
  }
}

async function updateDocumentClassifications(args: { runLog: RunLog; runOutput: RunOutput }) {
  const { supabaseAdmin } = await import('../../../lib/server/supabaseAdmin');
  const { runLog, runOutput } = args;
  const firmId = runLog.input_refs.firm_id;
  if (!firmId) return;

  const classifications = runOutput.document_classifications?.document_classifications ?? [];
  if (classifications.length === 0) return;

  const docIds = classifications
    .map((item) => item.document_id)
    .filter((docId) => typeof docId === 'string' && docId.length > 0);

  if (docIds.length === 0) return;

  const { data, error } = await supabaseAdmin
    .from('intake_documents')
    .select('id, classification')
    .in('id', docIds)
    .eq('intake_id', runLog.intake_id)
    .eq('firm_id', firmId);

  if (error || !data) {
    throw new Error('Unable to load intake documents for classification');
  }

  const classificationMap = new Map<string, DocumentClassification>();
  classifications.forEach((item) => {
    classificationMap.set(item.document_id, item);
  });

  for (const doc of data) {
    const item = classificationMap.get(doc.id);
    if (!item) continue;
    const existing = isRecord(doc.classification) ? doc.classification : {};
    const nextClassification = {
      ...existing,
      wf4: {
        document_type: item.document_type ?? null,
        confidence_score: item.confidence_score,
        confidence_level: item.confidence_level,
        evidence: item.evidence,
        notes_for_reviewer: item.notes_for_reviewer ?? null,
        ai_run_id: runLog.wf4_run_id,
        task_id: 'wf4.classify.documents.v1',
        updated_at: runLog.completed_at,
      },
    };

    const { error: updateError } = await supabaseAdmin
      .from('intake_documents')
      .update({ classification: nextClassification })
      .eq('id', doc.id)
      .eq('firm_id', firmId);

    if (updateError) {
      throw new Error('Unable to store document classification');
    }
  }
}

function parseJsonOutput(raw: unknown): TaskValidationResult<Record<string, unknown>> {
  if (isRecord(raw)) {
    return { ok: true, value: raw };
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!isRecord(parsed)) {
        return { ok: false, error: 'Parsed output is not an object' };
      }
      return { ok: true, value: parsed };
    } catch (error) {
      return { ok: false, error: 'Invalid JSON output' };
    }
  }
  return { ok: false, error: 'Output is not JSON' };
}

function validateExtractionOutput(output: Record<string, unknown>): TaskValidationResult<{ extractions: ExtractionItem[] }> {
  const extractions = output.extractions;
  if (!Array.isArray(extractions)) {
    return { ok: true, value: { extractions: [] } }; // Fail-safe: treat missing array as empty
  }
  const validItems: ExtractionItem[] = [];
  for (const item of extractions) {
    if (!isRecord(item)) continue;
    if (typeof item.field_key !== 'string') continue;
    if (!Object.prototype.hasOwnProperty.call(item, 'value')) continue;
    if (typeof item.value_type !== 'string') continue;
    if (typeof item.confidence_score !== 'number') continue;
    if (typeof item.confidence_level !== 'string') continue;
    if (typeof item.confidence_rationale_code !== 'string') continue;
    if (!Array.isArray(item.evidence)) continue;

    // Check evidence requirement strictly per item
    if (item.value !== null && item.value !== undefined && item.evidence.length === 0) {
      continue; // Drop item if no evidence for non-null value (Rule: Explainable AI)
    }

    const evidenceCheck = validateEvidencePointers(item.evidence as ExtractionItem['evidence']);
    if (!evidenceCheck.ok) continue;

    validItems.push(item as unknown as ExtractionItem);
  }
  return { ok: true, value: { extractions: validItems } };
}

function validateFlagsOutput(output: Record<string, unknown>): TaskValidationResult<{ flags: FlagItem[] }> {
  const flags = output.flags;
  if (!Array.isArray(flags)) {
    return { ok: true, value: { flags: [] } };
  }
  const validItems: FlagItem[] = [];
  for (const item of flags) {
    if (!isRecord(item)) continue;
    if (typeof item.flag_key !== 'string') continue;
    if (typeof item.flag_present !== 'boolean') continue;
    if (typeof item.confidence_score !== 'number') continue;
    if (typeof item.confidence_level !== 'string') continue;
    if (!Array.isArray(item.evidence)) continue;

    if (item.flag_present && item.evidence.length === 0) {
      continue; // Drop present flag without evidence
    }
    const evidenceCheck = validateEvidencePointers(item.evidence as FlagItem['evidence']);
    if (!evidenceCheck.ok) continue;
    if (typeof item.why_it_matters_for_review !== 'string') continue;

    validItems.push(item as unknown as FlagItem);
  }
  return { ok: true, value: { flags: validItems } };
}

function validateInconsistenciesOutput(
  output: Record<string, unknown>,
): TaskValidationResult<{ inconsistencies: InconsistencyItem[] }> {
  const inconsistencies = output.inconsistencies;
  if (!Array.isArray(inconsistencies)) {
    return { ok: true, value: { inconsistencies: [] } };
  }
  const validItems: InconsistencyItem[] = [];
  for (const item of inconsistencies) {
    if (!isRecord(item)) continue;
    if (typeof item.inconsistency_key !== 'string') continue;
    if (!Array.isArray(item.fields_involved)) continue;
    if (typeof item.summary !== 'string') continue;
    if (typeof item.severity !== 'string') continue;
    if (typeof item.confidence_score !== 'number') continue;
    if (!Array.isArray(item.evidence)) continue;
    if (item.evidence.length === 0) continue;
    const evidenceCheck = validateEvidencePointers(item.evidence as InconsistencyItem['evidence']);
    if (!evidenceCheck.ok) continue;

    validItems.push(item as unknown as InconsistencyItem);
  }
  return { ok: true, value: { inconsistencies: validItems } };
}

function validateCountyMentionsOutput(
  output: Record<string, unknown>,
  canonicalList?: string[],
): TaskValidationResult<{
  county_mentions: CountyMention[];
  deference: { wf3_canonical_county_present: boolean; wf3_canonical_county_value?: string };
}> {
  const countyMentions = output.county_mentions;
  const deference = output.deference;

  if (!isRecord(deference) || typeof deference.wf3_canonical_county_present !== 'boolean') {
    // Deference is critical, so we might need to fail or default?
    // Default to false if missing
  }

  const validDeference = {
    wf3_canonical_county_present: isRecord(deference) ? Boolean(deference.wf3_canonical_county_present) : false,
    wf3_canonical_county_value: (isRecord(deference) && typeof deference.wf3_canonical_county_value === 'string') ? deference.wf3_canonical_county_value : undefined
  };

  const validItems: CountyMention[] = [];
  if (Array.isArray(countyMentions)) {
    for (const item of countyMentions) {
      if (!isRecord(item)) continue;
      if (typeof item.raw_mention !== 'string') continue;
      if (typeof item.match_type !== 'string') continue;
      if (typeof item.confidence_score !== 'number') continue;
      if (!Array.isArray(item.evidence)) continue;
      if (item.evidence.length === 0) continue;
      if (item.suggested_county !== null && item.suggested_county !== undefined && typeof item.suggested_county !== 'string') continue;
      if (typeof item.suggested_county === 'string' && Array.isArray(canonicalList) && canonicalList.length > 0 && !canonicalList.includes(item.suggested_county)) {
        // Drop invalid county suggestion
        continue;
      }
      const evidenceCheck = validateEvidencePointers(item.evidence as CountyMention['evidence']);
      if (!evidenceCheck.ok) continue;

      validItems.push(item as unknown as CountyMention);
    }
  }

  return {
    ok: true,
    value: {
      county_mentions: validItems,
      deference: validDeference,
    },
  };
}

function validateDocumentClassificationOutput(
  output: Record<string, unknown>,
): TaskValidationResult<{ document_classifications: DocumentClassification[] }> {
  const documentClassifications = output.document_classifications;
  if (!Array.isArray(documentClassifications)) {
    return { ok: true, value: { document_classifications: [] } };
  }
  const validItems: DocumentClassification[] = [];
  for (const item of documentClassifications) {
    if (!isRecord(item)) continue;
    if (typeof item.document_id !== 'string') continue;
    if (item.document_type !== null && item.document_type !== undefined && typeof item.document_type !== 'string') continue;
    if (typeof item.confidence_score !== 'number') continue;
    if (typeof item.confidence_level !== 'string') continue;
    if (!Array.isArray(item.evidence)) continue;
    if (item.document_type && item.evidence.length === 0) continue;
    const evidenceCheck = validateEvidencePointers(item.evidence as DocumentClassification['evidence']);
    if (!evidenceCheck.ok) continue;

    validItems.push(item as unknown as DocumentClassification);
  }
  return {
    ok: true,
    value: { document_classifications: validItems },
  };
}

function validateCaseNarrativeOutput(
  output: Record<string, unknown>,
): TaskValidationResult<{
  case_narrative: {
    parties_summary: string;
    conflict_summary: string;
    goals_summary: string;
    timeline_overview?: string;
  };
}> {
  const caseNarrative = output.case_narrative;
  if (!isRecord(caseNarrative)) {
    return { ok: true, value: { case_narrative: { parties_summary: '', conflict_summary: '', goals_summary: '' } } };
  }

  return {
    ok: true,
    value: {
      case_narrative: {
        parties_summary: typeof caseNarrative.parties_summary === 'string' ? caseNarrative.parties_summary : '',
        conflict_summary: typeof caseNarrative.conflict_summary === 'string' ? caseNarrative.conflict_summary : '',
        goals_summary: typeof caseNarrative.goals_summary === 'string' ? caseNarrative.goals_summary : '',
        timeline_overview: typeof caseNarrative.timeline_overview === 'string' ? caseNarrative.timeline_overview : undefined,
      },
    },
  };
}

function validateReviewAttentionOutput(
  output: Record<string, unknown>,
): TaskValidationResult<{ review_attention: ReviewAttention }> {
  const reviewAttention = output.review_attention;
  const safeRefCheck = (items: unknown[]): items is Array<{ item: string, references: string[] }> => {
    // We process mapping inside
    return true;
  }

  const processList = (list: unknown): Array<{ item: string; references: string[] }> => {
    if (!Array.isArray(list)) return [];
    const valid: Array<{ item: string; references: string[] }> = [];
    for (const item of list) {
      if (!isRecord(item)) continue;
      if (typeof item.item !== 'string') continue;
      if (!Array.isArray(item.references)) continue;
      if (item.references.some((ref) => typeof ref !== 'string')) continue;
      valid.push(item as { item: string; references: string[] });
    }
    return valid;
  };

  if (!isRecord(reviewAttention)) {
    return { ok: true, value: { review_attention: { high_priority_items: [], medium_priority_items: [], low_priority_items: [] } } };
  }

  return {
    ok: true,
    value: {
      review_attention: {
        high_priority_items: processList(reviewAttention.high_priority_items),
        medium_priority_items: processList(reviewAttention.medium_priority_items),
        low_priority_items: processList(reviewAttention.low_priority_items),
      },
    },
  };
}

async function runTask(
  provider: LlmProvider,
  promptId: string,
  input: Record<string, unknown>,
): Promise<TaskValidationResult<Record<string, unknown>>> {
  const template = WF4_PROMPT_TEMPLATES[promptId];
  const systemPrompt = template?.system ?? 'Use wf4.system.v1';
  const userPrompt = template?.user ?? 'Return JSON only.';

  const raw = await provider.generateJson({
    promptId,
    systemPrompt,
    userPrompt,
    input,
  });

  return parseJsonOutput(raw);
}

function buildTaskInput(taskId: string, context: TaskContext) {
  const base = {
    intake_snapshot: context.intakeSnapshot,
    wf3_snapshot: context.wf3Snapshot,
  };

  switch (taskId) {
    case 'wf4.extract.schema_fields.v1':
      return {
        ...base,
        schema_allowlist: context.schemaAllowlist,
      };
    case 'wf4.normalize.county_mentions.v1':
      return {
        ...base,
        reference: {
          ga_counties: context.countyReference,
        },
      };
    case 'wf4.review_attention.summary.v1':
      return {
        wf4_outputs: context.previousOutputs,
      };
    default:
      return base;
  }
}

export async function runWf4(
  input: RunWf4Input,
  deps: RunWf4Dependencies = {},
): Promise<{ runLog: RunLog; runOutput: RunOutput }> {
  const now = deps.now ?? (() => new Date().toISOString());
  const startedAt = toIso(now);

  const intakeSnapshot = await (deps.loadIntakeSnapshot ?? loadIntakeSnapshot)(input.intakeId);
  const wf3Snapshot = await (deps.loadWf3Snapshot ?? loadWf3Snapshot)(input.wf3RunId);

  const promptBundleVersion = WF4_PROMPT_BUNDLE_VERSION;
  const taskCatalog = loadWf4TaskCatalog();
  const promptHash = hashValue({ templates: WF4_PROMPT_TEMPLATES, bundle: promptBundleVersion });
  const inputHash = hashValue({
    intake_snapshot: intakeSnapshot,
    wf3_snapshot: wf3Snapshot,
    prompt_bundle_version: promptBundleVersion,
    task_catalog: taskCatalog,
    prompt_hash: promptHash,
  });

  const existing = await (deps.findExistingRun ?? findExistingRun)({
    intakeId: intakeSnapshot.intake_id,
    inputHash,
  });
  if (existing) {
    return existing;
  }

  const runId = crypto.randomUUID();

  const schemaAllowlist = buildSchemaAllowlist();
  const countyLookup = loadWf4Counties();
  const counties = countyLookup.canonicalList;

  const provider = deps.llmProvider;

  const taskOutputs: Record<string, TaskResult<unknown>> = {};
  const runOutput: RunOutput = { task_outputs: taskOutputs };
  const taskStatuses: RunLog['per_task'] = {};

  if (!provider) {
    const completedAt = toIso(now);
    const runLog: RunLog = {
      wf4_run_id: runId,
      intake_id: intakeSnapshot.intake_id,
      wf3_run_id: wf3Snapshot.wf3_run_id,
      started_at: startedAt,
      completed_at: completedAt,
      status: 'FAIL',
      prompt_hash: promptHash,
      input_hash: inputHash,
      prompt_bundle_version: promptBundleVersion,
      per_task: {},
      input_refs: {
        intake_id: intakeSnapshot.intake_id,
        wf3_run_id: wf3Snapshot.wf3_run_id,
        firm_id: intakeSnapshot.firm_id ?? null,
      },
    };

    await (deps.storeRun ?? storeRun)({ runLog, runOutput });
    return { runLog, runOutput };
  }

  const context: TaskContext = {
    intakeSnapshot,
    wf3Snapshot,
    schemaAllowlist,
    countyReference: counties,
    previousOutputs: runOutput,
  };

  let failedCount = 0;

  for (const task of taskCatalog.tasks) {
    const taskId = task.task_id;
    const promptId = WF4_TASK_PROMPT_MAP[taskId] ?? taskId;
    const taskInput = buildTaskInput(taskId, context);
    let output: Record<string, unknown> | null = null;
    let error: string | undefined;

    try {

      console.log(`[WF4] Running task: ${taskId} with prompt: ${promptId}`);
      if (taskId === 'wf4.review_attention.summary.v1') {
        console.log(`[WF4] Review Attention Input Keys:`, Object.keys(taskInput));
        if ('wf4_outputs' in taskInput) {
          const prev = (taskInput as any).wf4_outputs;
          console.log(`[WF4] Prev Output Keys:`, Object.keys(prev || {}));
          if (prev.extractions?.extractions) console.log('Extractions count:', prev.extractions.extractions.length);
          if (prev.flags?.flags) console.log('Flags count:', prev.flags.flags.length);
        }
      }
      const rawResult = await runTask(provider, promptId, taskInput);
      if (!rawResult.ok) {
        throw new Error(rawResult.error);
      }
      output = rawResult.value;

      let validation: TaskValidationResult<unknown> = { ok: true, value: output };
      if (taskId === 'wf4.extract.schema_fields.v1') {
        validation = validateExtractionOutput(output);
      } else if (
        taskId === 'wf4.flags.dv_indicators.v1' ||
        taskId === 'wf4.flags.jurisdiction_complexity.v1' ||
        taskId === 'wf4.flags.custody_conflict.v1'
      ) {
        validation = validateFlagsOutput(output);
      } else if (taskId === 'wf4.consistency.cross_field.v1') {
        validation = validateInconsistenciesOutput(output);
      } else if (taskId === 'wf4.normalize.county_mentions.v1') {
        validation = validateCountyMentionsOutput(output, counties);
      } else if (taskId === 'wf4.classify.documents.v1') {
        validation = validateDocumentClassificationOutput(output);
      } else if (taskId === 'wf4.summarize.case_narrative.v1') {
        validation = validateCaseNarrativeOutput(output);
      } else if (taskId === 'wf4.review_attention.summary.v1') {
        validation = validateReviewAttentionOutput(output);
      }

      if (!validation.ok) {
        throw new Error(validation.error);
      }



      console.log(`[WF4] Task ${taskId} Success. Output Keys:`, Object.keys((validation.value as object) || {}));

      taskOutputs[taskId] = {
        task_id: taskId,
        prompt_id: promptId,
        status: 'SUCCESS',
        output: validation.value,
      };

      if (taskId === 'wf4.extract.schema_fields.v1') {
        runOutput.extractions = validation.value as { extractions: ExtractionItem[] };
      }
      if (taskId === 'wf4.flags.dv_indicators.v1') {
        runOutput.flags = {
          ...(runOutput.flags ?? {}),
          dv_indicators: validation.value as { flags: FlagItem[] },
        };
      }
      if (taskId === 'wf4.flags.jurisdiction_complexity.v1') {
        runOutput.flags = {
          ...(runOutput.flags ?? {}),
          jurisdiction_complexity: validation.value as { flags: FlagItem[] },
        };
      }
      if (taskId === 'wf4.flags.custody_conflict.v1') {
        runOutput.flags = {
          ...(runOutput.flags ?? {}),
          custody_conflict: validation.value as { flags: FlagItem[] },
        };
      }
      if (taskId === 'wf4.consistency.cross_field.v1') {
        runOutput.inconsistencies = validation.value as { inconsistencies: InconsistencyItem[] };
      }
      if (taskId === 'wf4.normalize.county_mentions.v1') {
        runOutput.county_mentions = validation.value as {
          county_mentions: CountyMention[];
          deference: { wf3_canonical_county_present: boolean; wf3_canonical_county_value?: string };
        };
      }
      if (taskId === 'wf4.classify.documents.v1') {
        runOutput.document_classifications = validation.value as {
          document_classifications: DocumentClassification[];
        };
      }
      if (taskId === 'wf4.summarize.case_narrative.v1') {
        runOutput.case_narrative = (validation.value as any).case_narrative;
      }
      if (taskId === 'wf4.review_attention.summary.v1') {
        const attn = validation.value as { review_attention: ReviewAttention };
        runOutput.review_attention = attn;
        console.log(`[WF4] Review Attention Items: High=${attn.review_attention?.high_priority_items?.length}`);
      }
    } catch (taskError) {
      failedCount += 1;
      error = taskError instanceof Error ? taskError.message : 'Task failed';
      taskOutputs[taskId] = {
        task_id: taskId,
        prompt_id: promptId,
        status: 'FAILED',
        output: null,
        error,
      };
    }

    taskStatuses[taskId] = {
      prompt_id: promptId,
      status: taskOutputs[taskId].status,
      error: taskOutputs[taskId].error,
    };
  }

  const completedAt = toIso(now);
  const usageSummary = typeof provider.getUsageSummary === 'function' ? provider.getUsageSummary() : undefined;
  const status =
    failedCount === taskCatalog.tasks.length
      ? 'FAIL'
      : failedCount > 0
        ? 'PARTIAL'
        : 'SUCCESS';

  const runLog: RunLog = {
    wf4_run_id: runId,
    intake_id: intakeSnapshot.intake_id,
    wf3_run_id: wf3Snapshot.wf3_run_id,
    started_at: startedAt,
    completed_at: completedAt,
    status,
    model_provider: provider.provider,
    model_name: provider.model,
    prompt_hash: promptHash,
    input_hash: inputHash,
    prompt_bundle_version: promptBundleVersion,
    per_task: taskStatuses,
    input_refs: {
      intake_id: intakeSnapshot.intake_id,
      wf3_run_id: wf3Snapshot.wf3_run_id,
      firm_id: intakeSnapshot.firm_id ?? null,
    },
    usage: usageSummary,
    cost_usd: usageSummary?.cost_usd,
  };

  await (deps.storeRun ?? storeRun)({ runLog, runOutput });
  try {
    await (deps.storeFlags ?? storeFlags)({ runLog, runOutput });
  } catch {
    // Fail-safe: do not block WF4 run completion.
  }
  try {
    await (deps.updateDocumentClassifications ?? updateDocumentClassifications)({ runLog, runOutput });
  } catch {
    // Fail-safe: do not block WF4 run completion.
  }

  return { runLog, runOutput };
}
