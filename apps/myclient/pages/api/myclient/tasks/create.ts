import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; task: unknown };

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

  const body = (req.body ?? {}) as {
    firmId?: string;
    caseId?: string;
    title?: string;
    description?: string | null;
    due_date?: string;
  };

  const firmId = typeof body.firmId === 'string' ? body.firmId.trim() : '';
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : null;
  const dueDate = typeof body.due_date === 'string' ? body.due_date.trim() : '';

  if (!firmId || !caseId || !title || !dueDate) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id, role')
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

  if (!['admin', 'attorney'].includes(String(membership.role).toLowerCase())) {
    return res.status(403).json({ ok: false, error: 'Insufficient permissions' });
  }

  const { data, error } = await adminClient
    .from('case_tasks')
    .insert({
      firm_id: firmId,
      case_id: caseId,
      title,
      description,
      due_date: dueDate,
      created_by: authData.user.id,
    })
    .select('id, firm_id, case_id, title, description, due_date, status, created_at, updated_at, completed_at')
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, task: data });
}
