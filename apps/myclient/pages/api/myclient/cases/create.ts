import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { CaseCreateSchema, buildCaseTitle } from '@/lib/caseSchema';
import { canCreateCase } from '@/lib/plans';

type CreateBody = {
  client_first_name?: string;
  client_last_name?: string;
  client_email?: string;
  client_phone?: string;
  title?: string;
  matter_type?: string;
  status?: string;
  state?: string;
  county?: string;
  court_name?: string;
  case_number?: string;
  internal_notes?: string;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; caseId: string };

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

  const body = (req.body ?? {}) as CreateBody;
  const parsed = CaseCreateSchema.safeParse({
    client_first_name: body.client_first_name ?? '',
    client_last_name: body.client_last_name ?? '',
    client_email: body.client_email ?? '',
    client_phone: body.client_phone ?? '',
    title: body.title ?? '',
    matter_type: body.matter_type ?? '',
    status: body.status ?? '',
    state: body.state ?? '',
    county: body.county ?? '',
    court_name: body.court_name ?? '',
    case_number: body.case_number ?? '',
    internal_notes: body.internal_notes ?? '',
  });

  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.errors[0]?.message || 'Invalid intake data' });
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
    return res.status(403).json({ ok: false, error: 'You do not have permission to create cases.' });
  }

  const { data: firmRow, error: firmError } = await adminClient
    .from('firms')
    .select('plan')
    .eq('id', membership.firm_id)
    .single();

  if (firmError) {
    return res.status(500).json({ ok: false, error: firmError.message });
  }

  const { count: caseCount, error: countError } = await adminClient
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', membership.firm_id);

  if (countError) {
    return res.status(500).json({ ok: false, error: countError.message });
  }

  const plan = (firmRow?.plan as 'free' | 'pro' | 'enterprise' | undefined) ?? 'free';
  const limitCheck = canCreateCase({ plan, currentCaseCount: caseCount ?? 0 });
  if (!limitCheck.ok) {
    try {
      await adminClient.from('case_activity').insert({
        firm_id: membership.firm_id,
        actor_user_id: authData.user.id,
        event_type: 'plan_limit_hit',
        message: 'Case limit reached',
        metadata: { kind: 'cases' },
      });
    } catch {
      // best-effort logging
    }
    return res.status(403).json({ ok: false, error: `${limitCheck.reason} Upgrade to Pro to add more cases.` });
  }

  const input = parsed.data;
  const finalTitle = buildCaseTitle(input);

  const { data: inserted, error: insertError } = await adminClient
    .from('cases')
    .insert({
      firm_id: membership.firm_id,
      client_name: `${input.client_first_name} ${input.client_last_name}`.trim(),
      client_first_name: input.client_first_name,
      client_last_name: input.client_last_name,
      client_email: input.client_email || null,
      client_phone: input.client_phone || null,
      title: finalTitle,
      matter_type: input.matter_type || 'Divorce',
      status: input.status || 'open',
      state: input.state || null,
      county: input.county || null,
      court_name: input.court_name || null,
      case_number: input.case_number || null,
      internal_notes: input.internal_notes || null,
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to create case' });
  }

  try {
    await adminClient.from('case_activity').insert({
      firm_id: membership.firm_id,
      case_id: inserted.id,
      actor_user_id: authData.user.id,
      event_type: 'case_created',
      message: `Case created for ${input.client_last_name}, ${input.client_first_name}`,
      metadata: { source: 'intake' },
    });
  } catch {
    // best-effort logging
  }

  return res.status(200).json({ ok: true, caseId: inserted.id });
}
