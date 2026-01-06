import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { CaseRow } from '@/types/cases';

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; cases: CaseRow[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | SuccessResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
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

  const { firmId } = req.query;
  if (typeof firmId !== 'string' || !firmId) {
    return res.status(400).json({ ok: false, error: 'firmId is required' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
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
    .select('firm_id')
    .eq('user_id', authData.user.id)
    .eq('firm_id', firmId)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }

  const { data, error } = await adminClient
    .from('cases')
    .select(
      [
        'id',
        'firm_id',
        'title',
        'client_first_name',
        'client_last_name',
        'client_email',
        'client_phone',
        'matter_type',
        'status',
        'last_activity_at',
        'created_at',
        'county',
        'state',
        'case_number',
        'internal_notes',
        'case_activity(message, created_at)',
      ].join(','),
    )
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .order('created_at', { foreignTable: 'case_activity', ascending: false })
    .limit(1, { foreignTable: 'case_activity' });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  const rows = (data ?? []) as Array<
    CaseRow & { case_activity?: Array<{ message: string | null; created_at: string | null }> }
  >;

  const cases = rows.map((row) => {
    const activity = Array.isArray(row.case_activity) ? row.case_activity[0] : null;
    const activityMessage = activity?.message ?? null;
    const activityAt = activity?.created_at ?? row.last_activity_at ?? row.created_at ?? null;
    return {
      ...row,
      last_activity_message: activityMessage,
      last_activity_at: activityAt,
    };
  });

  return res.status(200).json({ ok: true, cases });
}
