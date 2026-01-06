import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { CaseRow } from '@/types/cases';

type ErrorResponse = { ok: false; error: string };
type CaseListRow = CaseRow & {
  last_activity_message: string | null;
  last_activity_at: string | null;
};

type SuccessResponse = { ok: true; cases: CaseListRow[] };

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

  const raw = (data ?? []) as unknown as Array<Record<string, any>>;

  const cases: CaseListRow[] = raw.map((row) => {
    const activity = Array.isArray(row.case_activity) ? row.case_activity[0] : null;
    const activityMessage = typeof activity?.message === 'string' ? activity.message : null;
    const activityAt = (typeof activity?.created_at === 'string' ? activity.created_at : null)
      ?? (typeof row.last_activity_at === 'string' ? row.last_activity_at : null)
      ?? (typeof row.created_at === 'string' ? row.created_at : null);

    return {
      id: typeof row.id === 'string' ? row.id : '',
      firm_id: typeof row.firm_id === 'string' ? row.firm_id : null,
      title: typeof row.title === 'string' ? row.title : null,
      case_number: typeof row.case_number === 'string' ? row.case_number : null,
      matter_type: typeof row.matter_type === 'string' ? row.matter_type : null,
      client_first_name: typeof row.client_first_name === 'string' ? row.client_first_name : null,
      client_last_name: typeof row.client_last_name === 'string' ? row.client_last_name : null,
      client_email: typeof row.client_email === 'string' ? row.client_email : null,
      client_phone: typeof row.client_phone === 'string' ? row.client_phone : null,
      state: typeof row.state === 'string' ? row.state : null,
      county: typeof row.county === 'string' ? row.county : null,
      status: typeof row.status === 'string' ? row.status : null,
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      internal_notes: typeof row.internal_notes === 'string' ? row.internal_notes : null,
      last_activity_message: activityMessage,
      last_activity_at: activityAt,
    };
  }).filter((row) => row.id);

  return res.status(200).json({ ok: true, cases });
}
