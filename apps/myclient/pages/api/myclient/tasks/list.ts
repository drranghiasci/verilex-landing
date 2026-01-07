import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; tasks: unknown[] };

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

  const { firmId, from, to, caseId, rangeStart, rangeEnd } = req.query;
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

  let query = adminClient
    .from('case_tasks')
    .select('id, firm_id, case_id, title, description, due_at, due_date, due_time, status, ribbon_color, created_at, updated_at, completed_at, created_by')
    .eq('firm_id', firmId);

  if (typeof caseId === 'string' && caseId) {
    query = query.eq('case_id', caseId);
  }
  if (typeof rangeStart === 'string' && rangeStart) {
    query = query.gte('due_at', rangeStart);
  }
  if (typeof rangeEnd === 'string' && rangeEnd) {
    query = query.lte('due_at', rangeEnd);
  }
  if (typeof from === 'string' && from) {
    query = query.gte('due_date', from);
  }
  if (typeof to === 'string' && to) {
    query = query.lte('due_date', to);
  }

  const { data, error } = await query.order('due_date', { ascending: true }).order('due_time', { ascending: true });
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, tasks: data ?? [] });
}
