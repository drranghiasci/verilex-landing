import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getRuleCatalog } from '../../../../../../src/workflow3/catalog/loadRuleCatalog';
import { loadGaCounties } from '../../../../../../src/workflow3/counties/gaCountiesLoader';
import { evaluateRules } from '../../../../../../src/workflow3/evaluator/evaluateRules';
import type { RulesEngineResult } from '../../../../../../src/workflow3/evaluator/types';

type IntakeRecord = {
  id: string;
  firm_id: string;
  status: string;
  submitted_at: string | null;
  raw_payload: Record<string, unknown> | null;
};

type ExtractionRow = {
  version: number | null;
};

type ResolveBody = {
  intakeId?: string;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
  ok: true;
  evaluation: RulesEngineResult;
  extractionId?: string;
  version?: number;
};

const UUID_RE = /^[0-9a-fA-F-]{36}$/;

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | SuccessResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
  }

  const body = (req.body ?? {}) as ResolveBody;
  const intakeId = typeof body.intakeId === 'string' ? body.intakeId.trim() : '';

  if (!UUID_RE.test(intakeId)) {
    return res.status(400).json({ ok: false, error: 'Invalid intake id' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ ok: false, error: 'Invalid session' });
  }

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id, role')
    .eq('user_id', authData.user.id)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }
  if (!['admin', 'attorney'].includes(membership.role)) {
    return res.status(403).json({ ok: false, error: 'You do not have permission to resolve WF3 blocks.' });
  }

  try {
    const { data: intakeRow, error: intakeError } = await adminClient
      .from('intakes')
      .select('id, firm_id, status, submitted_at, raw_payload')
      .eq('id', intakeId)
      .eq('firm_id', membership.firm_id)
      .maybeSingle();

    if (intakeError) {
      return res.status(500).json({ ok: false, error: intakeError.message });
    }
    if (!intakeRow) {
      return res.status(404).json({ ok: false, error: 'Intake not found' });
    }
    if (!intakeRow.submitted_at && intakeRow.status !== 'submitted') {
      return res.status(409).json({ ok: false, error: 'Intake is not submitted' });
    }

    const intake = intakeRow as IntakeRecord;
    const { catalog } = getRuleCatalog();
    const payload = isPlainObject(intake.raw_payload) ? intake.raw_payload : {};
    const normalizedPayload = buildWorkflow3Payload(payload);
    const counties = loadGaCounties();
    const evaluation = evaluateRules(normalizedPayload, catalog, counties);

    const { data: versionRows, error: versionError } = await adminClient
      .from('intake_extractions')
      .select('version')
      .eq('intake_id', intake.id)
      .order('version', { ascending: false })
      .limit(1);

    if (versionError) {
      return res.status(500).json({ ok: false, error: versionError.message });
    }

    const lastVersion = (versionRows?.[0] as ExtractionRow | undefined)?.version ?? null;
    const nextVersion = typeof lastVersion === 'number' ? lastVersion + 1 : 1;

    const { data: inserted, error: insertError } = await adminClient
      .from('intake_extractions')
      .insert({
        intake_id: intake.id,
        firm_id: intake.firm_id,
        version: nextVersion,
        schema_version: 'ga_divorce_custody_v1',
        extracted_data: {
          rules_engine: evaluation,
        },
      })
      .select('id, version')
      .single();

    if (insertError || !inserted) {
      return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to write WF3 rules' });
    }

    return res.status(200).json({
      ok: true,
      evaluation,
      extractionId: inserted.id,
      version: inserted.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve WF3 rules';
    return res.status(500).json({ ok: false, error: message });
  }
}
