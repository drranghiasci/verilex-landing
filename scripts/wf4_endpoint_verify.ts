import type { RunLog, RunOutput } from '../src/workflows/wf4/types';

type JsonRecord = Record<string, unknown>;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

async function postJson<T>(baseUrl: string, path: string, body: JsonRecord, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'x-intake-token': token } : {}),
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as T & { ok?: boolean; error?: string };
  if (!response.ok || (payload && payload.ok === false)) {
    throw new Error(payload?.error || `Request failed: ${path}`);
  }
  return payload;
}

async function run() {
  const baseUrl = getEnv('INTAKE_BASE_URL').replace(/\/+$/, '');
  const firmSlug = getEnv('TEST_FIRM_SLUG');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const start = await postJson<{ token: string }>(baseUrl, '/api/intake/start', {
    firm_slug: firmSlug,
    matter_type: 'divorce',
    intake_channel: 'web',
  });

  const load = await postJson<{ intake: { id: string } }>(baseUrl, '/api/intake/load', {}, start.token);
  const intakeId = load.intake.id;

  await postJson(baseUrl, '/api/intake/submit', { intakeId }, start.token);

  const { supabaseAdmin } = await import('../lib/server/supabaseAdmin');
  const { data: runs, error: runError } = await supabaseAdmin
    .from('ai_runs')
    .select('id, inputs, outputs, created_at')
    .eq('run_kind', 'wf4')
    .eq('intake_id', intakeId)
    .order('created_at', { ascending: false });

  if (runError || !runs || runs.length === 0) {
    throw new Error('No WF4 ai_runs rows found');
  }

  const latest = runs[0] as { inputs?: any; outputs?: any };
  const outputs = latest.outputs as { run_log?: RunLog; run_output?: RunOutput } | null;
  const runLog = outputs?.run_log;
  const runOutput = outputs?.run_output;

  assert(runLog !== undefined, 'Missing run_log in ai_runs outputs');
  assert(runOutput !== undefined, 'Missing run_output in ai_runs outputs');
  assert(Boolean(runLog?.input_hash), 'Missing input_hash in run log');
  assert(Boolean(runLog?.prompt_hash), 'Missing prompt_hash in run log');

  const flags = [
    ...(runOutput?.flags?.dv_indicators?.flags ?? []),
    ...(runOutput?.flags?.jurisdiction_complexity?.flags ?? []),
    ...(runOutput?.flags?.custody_conflict?.flags ?? []),
  ].filter((flag) => flag.flag_present);

  if (flags.length > 0) {
    const { data: flagRows, error: flagError } = await supabaseAdmin
      .from('ai_flags')
      .select('id, flag_key')
      .eq('intake_id', intakeId);
    if (flagError) {
      throw new Error('Unable to load ai_flags');
    }
    assert((flagRows ?? []).length > 0, 'Expected ai_flags rows for flagged outputs');
  }

  const docClassifications = runOutput?.document_classifications?.document_classifications ?? [];
  if (docClassifications.length > 0) {
    const docIds = docClassifications.map((item) => item.document_id);
    const { data: docRows, error: docError } = await supabaseAdmin
      .from('intake_documents')
      .select('id, classification')
      .in('id', docIds);
    if (docError) {
      throw new Error('Unable to load intake_documents');
    }
    const classified = (docRows ?? []).filter((row) => row.classification && row.classification.wf4);
    assert(classified.length > 0, 'Expected document classification stored in intake_documents');
  }

  const inputHash = typeof latest.inputs?.input_hash === 'string' ? latest.inputs.input_hash : null;
  assert(Boolean(inputHash), 'Missing input_hash in ai_runs.inputs');

  await postJson(baseUrl, '/api/intake/submit', { intakeId }, start.token);

  const { data: dedupeRuns, error: dedupeError } = await supabaseAdmin
    .from('ai_runs')
    .select('id, inputs')
    .eq('run_kind', 'wf4')
    .eq('intake_id', intakeId)
    .contains('inputs', { input_hash: inputHash });

  if (dedupeError) {
    throw new Error('Unable to verify idempotency');
  }

  assert((dedupeRuns ?? []).length === 1, 'Expected idempotent WF4 run for same input_hash');

  console.log('WF4 endpoint verification passed.');
}

run().catch((error) => {
  console.error('WF4 endpoint verification failed.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
