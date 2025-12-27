import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type UpdateBody = {
  id?: string;
  client_name?: string;
  matter_type?: string;
  status?: string;
  internal_notes?: string | null;
};

type ErrorResponse = { ok: false; error: string };

type SuccessResponse = { ok: true };

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

  const body = (req.body ?? {}) as UpdateBody;
  const id = typeof body.id === 'string' ? body.id.trim() : '';
  const clientName = typeof body.client_name === 'string' ? body.client_name.trim() : '';
  const matterType = typeof body.matter_type === 'string' ? body.matter_type.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';
  const internalNotes = typeof body.internal_notes === 'string' ? body.internal_notes : null;

  if (!UUID_RE.test(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid case id' });
  }

  if (!clientName || !matterType || !status) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id')
    .eq('user_id', authData.user.id)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }

  const { data: caseRows, error: caseError } = await adminClient
    .from('cases')
    .select('id, firm_id')
    .eq('id', id)
    .limit(1);

  if (caseError) {
    return res.status(500).json({ ok: false, error: caseError.message });
  }

  const caseRow = Array.isArray(caseRows) && caseRows.length > 0 ? caseRows[0] : null;
  if (!caseRow || caseRow.firm_id !== membership.firm_id) {
    return res.status(404).json({ ok: false, error: 'Case not found' });
  }

  const { error: updateError } = await adminClient
    .from('cases')
    .update({
      client_name: clientName,
      matter_type: matterType,
      status,
      internal_notes: internalNotes,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    return res.status(500).json({ ok: false, error: updateError.message });
  }

  return res.status(200).json({ ok: true });
}
