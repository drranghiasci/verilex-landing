import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type DecideBody = {
  intakeId?: string;
  decision?: 'accepted' | 'rejected' | string;
  reason?: string;
  caseId?: string;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
  ok: true;
  decision: {
    id: string;
    decision: string;
    case_id: string | null;
    decided_at: string;
  };
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

  const body = (req.body ?? {}) as DecideBody;
  const intakeId = typeof body.intakeId === 'string' ? body.intakeId.trim() : '';
  const decision = typeof body.decision === 'string' ? body.decision.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';

  if (!UUID_RE.test(intakeId)) {
    return res.status(400).json({ ok: false, error: 'Invalid intake id' });
  }

  if (decision !== 'accepted' && decision !== 'rejected') {
    return res.status(400).json({ ok: false, error: 'decision must be accepted or rejected' });
  }

  if (decision === 'rejected' && !reason) {
    return res.status(400).json({ ok: false, error: 'Rejection reason is required' });
  }

  if (caseId && !UUID_RE.test(caseId)) {
    return res.status(400).json({ ok: false, error: 'Invalid case id' });
  }

  if (decision === 'accepted' && !caseId) {
    return res.status(400).json({ ok: false, error: 'caseId is required for acceptance' });
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
    return res.status(403).json({ ok: false, error: 'You do not have permission to decide intakes.' });
  }

  const { data: intakeRow, error: intakeError } = await adminClient
    .from('intakes')
    .select('id, firm_id, submitted_at')
    .eq('id', intakeId)
    .eq('firm_id', membership.firm_id)
    .maybeSingle();

  if (intakeError) {
    return res.status(500).json({ ok: false, error: intakeError.message });
  }
  if (!intakeRow) {
    return res.status(404).json({ ok: false, error: 'Intake not found' });
  }
  if (!intakeRow.submitted_at) {
    return res.status(409).json({ ok: false, error: 'Intake is not submitted' });
  }

  const { data: existing, error: existingError } = await adminClient
    .from('intake_decisions')
    .select('id, decision, case_id, decided_at')
    .eq('intake_id', intakeId)
    .eq('firm_id', membership.firm_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return res.status(500).json({ ok: false, error: existingError.message });
  }

  if (existing) {
    return res.status(200).json({
      ok: true,
      decision: {
        id: existing.id,
        decision: existing.decision,
        case_id: existing.case_id ?? null,
        decided_at: existing.decided_at,
      },
    });
  }

  const { data: inserted, error: insertError } = await adminClient
    .from('intake_decisions')
    .insert({
      firm_id: membership.firm_id,
      intake_id: intakeId,
      case_id: caseId || null,
      decision,
      reason: reason || null,
      decided_by: authData.user.id,
      decided_at: new Date().toISOString(),
    })
    .select('id, decision, case_id, decided_at')
    .single();

  if (insertError || !inserted) {
    return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to save decision' });
  }

  return res.status(200).json({
    ok: true,
    decision: {
      id: inserted.id,
      decision: inserted.decision,
      case_id: inserted.case_id ?? null,
      decided_at: inserted.decided_at,
    },
  });
}
