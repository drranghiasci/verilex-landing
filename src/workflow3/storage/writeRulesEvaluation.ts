import { supabaseAdmin } from '../../../lib/server/supabaseAdmin';
import type { RulesEngineResult } from '../evaluator/types';
import type { IntakeExtractionInsert, WriteRulesEvaluationOptions, WriteRulesEvaluationResult } from './types';

const DEFAULT_SCHEMA_VERSION = 'ga_divorce_custody_v1';

async function getIntakeMeta(intakeId: string) {
  const { data, error } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, submitted_at, status')
    .eq('id', intakeId)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to load intake metadata');
  }
  if (!data) {
    throw new Error('Intake not found');
  }
  if (!data.submitted_at) {
    throw new Error('Intake is not submitted');
  }

  return data;
}

export async function getNextExtractionVersion(intakeId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('intake_extractions')
    .select('version')
    .eq('intake_id', intakeId)
    .order('version', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error('Unable to determine extraction version');
  }

  const current = data && data.length > 0 ? data[0]?.version : null;
  if (typeof current === 'number') {
    return current + 1;
  }
  return 1;
}

export async function writeRulesEvaluation(
  intakeId: string,
  rulesOutput: RulesEngineResult,
  options: WriteRulesEvaluationOptions = {},
): Promise<WriteRulesEvaluationResult> {
  const intake = await getIntakeMeta(intakeId);
  const version = await getNextExtractionVersion(intakeId);
  const schemaVersion = options.schemaVersion ?? DEFAULT_SCHEMA_VERSION;

  const payload: IntakeExtractionInsert = {
    intake_id: intakeId,
    firm_id: intake.firm_id,
    version,
    schema_version: schemaVersion,
    extracted_data: {
      rules_engine: rulesOutput,
    },
  };

  const { data, error } = await supabaseAdmin
    .from('intake_extractions')
    .insert(payload)
    .select('id, intake_id, version, schema_version, created_at')
    .single();

  if (error || !data) {
    throw new Error('Unable to write rules evaluation');
  }

  return data;
}
