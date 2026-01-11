import { supabaseAdmin } from '../../lib/server/supabaseAdmin';
import { loadGaCounties } from './counties/gaCountiesLoader';
import { getRuleCatalog } from './catalog/loadRuleCatalog';
import { evaluateRules } from './evaluator/evaluateRules';
import { writeRulesEvaluation } from './storage/writeRulesEvaluation';
import type { RulesEngineResult } from './evaluator/types';

export type RunWorkflow3Input = {
  intake_id: string;
  firm_id?: string;
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

  const existing = await findExistingEvaluation(intake.id, ruleset_version);
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
  const counties = loadGaCounties();
  const evaluation = evaluateRules(payload, catalog, counties);

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
