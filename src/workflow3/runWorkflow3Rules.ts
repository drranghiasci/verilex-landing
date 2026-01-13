import { supabaseAdmin } from '../../lib/server/supabaseAdmin';
import { loadGaCounties } from './counties/gaCountiesLoader';
import { getRuleCatalog } from './catalog/loadRuleCatalog';
import { evaluateRules } from './evaluator/evaluateRules';
import { writeRulesEvaluation } from './storage/writeRulesEvaluation';
import type { RulesEngineResult } from './evaluator/types';

export type RunWorkflow3Input = {
  intake_id: string;
  firm_id?: string;
  force?: boolean;
};

export type RunWorkflow3Result = {
  evaluation: RulesEngineResult;
  ruleset_version: string;
  written: boolean;
  extraction_id?: string;
  version?: number;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function buildRepeatableGroup(payload: Record<string, unknown>, keys: string[]) {
  const arrays = keys.map((key) => toArray(payload[key]));
  const count = arrays.reduce((max, entries) => Math.max(max, entries.length), 0);
  if (count === 0) return [];

  const entries: Array<Record<string, unknown>> = [];
  for (let index = 0; index < count; index += 1) {
    const entry: Record<string, unknown> = {};
    let hasAny = false;
    keys.forEach((key, keyIndex) => {
      const value = arrays[keyIndex][index];
      if (value !== undefined) {
        entry[key] = value;
      }
      if (hasValue(value)) {
        hasAny = true;
      }
    });
    if (hasAny) {
      entries.push(entry);
    }
  }

  return entries;
}

function buildWorkflow3Payload(payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };

  if (!Array.isArray(payload.children) || payload.children.length === 0) {
    const children = buildRepeatableGroup(payload, [
      'child_full_name',
      'child_dob',
      'child_current_residence',
      'biological_relation',
      'special_needs',
    ]);
    if (children.length > 0) {
      next.children = children;
    }
  }

  if (!Array.isArray(payload.assets) || payload.assets.length === 0) {
    const assets = buildRepeatableGroup(payload, [
      'asset_type',
      'ownership',
      'estimated_value',
      'title_holder',
      'acquired_pre_marriage',
    ]);
    if (assets.length > 0) {
      next.assets = assets;
    }
  }

  if (!Array.isArray(payload.debts) || payload.debts.length === 0) {
    const debts = buildRepeatableGroup(payload, [
      'debt_type',
      'amount',
      'responsible_party',
      'incurred_during_marriage',
    ]);
    if (debts.length > 0) {
      next.debts = debts;
    }
  }

  const custody: Record<string, unknown> = isPlainObject(payload.children_custody)
    ? { ...payload.children_custody }
    : {};
  [
    'custody_type_requested',
    'parenting_plan_exists',
    'modification_existing_order',
    'current_parenting_schedule',
    'school_district',
  ].forEach((key) => {
    if (payload[key] !== undefined && custody[key] === undefined) {
      custody[key] = payload[key];
    }
  });
  if (Object.keys(custody).length > 0) {
    next.children_custody = custody;
  }

  return next;
}

async function loadIntake(intakeId: string) {
  const { data, error } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, status, submitted_at, raw_payload')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load intake');
  }
  if (!data) {
    throw new Error('Intake not found');
  }

  return data;
}

async function findExistingEvaluation(intakeId: string, rulesetVersion: string) {
  const { data, error } = await supabaseAdmin
    .from('intake_extractions')
    .select('id, version, extracted_data, schema_version, created_at')
    .eq('intake_id', intakeId)
    .eq('extracted_data->rules_engine->>ruleset_version', rulesetVersion)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to query existing rules evaluation');
  }

  if (!data) return null;
  const extracted = data.extracted_data as { rules_engine?: RulesEngineResult } | null;
  if (!extracted?.rules_engine) return null;

  return { ...data, rules_engine: extracted.rules_engine };
}

export async function runWorkflow3Rules(
  input: RunWorkflow3Input,
): Promise<RunWorkflow3Result> {
  const intake = await loadIntake(input.intake_id);
  if (input.firm_id && input.firm_id !== intake.firm_id) {
    throw new Error('Intake firm mismatch');
  }

  if (!intake.submitted_at && intake.status !== 'submitted') {
    throw new Error('Intake is not submitted');
  }

  const { catalog, ruleset_version } = getRuleCatalog();

  const existing = input.force ? null : await findExistingEvaluation(intake.id, ruleset_version);
  if (existing) {
    return {
      evaluation: existing.rules_engine,
      ruleset_version,
      written: false,
      extraction_id: existing.id,
      version: existing.version,
    };
  }

  const payload = isPlainObject(intake.raw_payload) ? intake.raw_payload : {};
  const normalizedPayload = buildWorkflow3Payload(payload);
  const counties = loadGaCounties();
  const evaluation = evaluateRules(normalizedPayload, catalog, counties);

  const inserted = await writeRulesEvaluation(intake.id, evaluation);

  console.info(`[wf3] intake_id=${intake.id} ruleset=${ruleset_version} version=${inserted.version}`);

  return {
    evaluation,
    ruleset_version,
    written: true,
    extraction_id: inserted.id,
    version: inserted.version,
  };
}
