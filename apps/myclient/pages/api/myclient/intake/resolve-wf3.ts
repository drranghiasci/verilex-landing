import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { runWorkflow3Rules } from '../../../../../../src/workflow3/runWorkflow3Rules';
import type { RulesEngineResult } from '../../../../../../src/workflow3/evaluator/types';

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
    const result = await runWorkflow3Rules({
      intake_id: intakeId,
      firm_id: membership.firm_id,
      force: true,
    });

    return res.status(200).json({
      ok: true,
      evaluation: result.evaluation,
      extractionId: result.extraction_id,
      version: result.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to resolve WF3 rules';
    if (message.includes('Intake firm mismatch')) {
      return res.status(403).json({ ok: false, error: 'Intake firm mismatch' });
    }
    if (message.includes('not found')) {
      return res.status(404).json({ ok: false, error: 'Intake not found' });
    }
    if (message.includes('not submitted')) {
      return res.status(409).json({ ok: false, error: 'Intake is not submitted' });
    }
    return res.status(500).json({ ok: false, error: message });
  }
}
