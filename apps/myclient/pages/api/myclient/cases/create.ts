import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type CreateBody = {
  client_first_name?: string;
  client_last_name?: string;
  client_email?: string;
  client_phone?: string;
  matter_title?: string;
  notes?: string;
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
  const firstName = typeof body.client_first_name === 'string' ? body.client_first_name.trim() : '';
  const lastName = typeof body.client_last_name === 'string' ? body.client_last_name.trim() : '';
  const email = typeof body.client_email === 'string' ? body.client_email.trim() : '';
  const phone = typeof body.client_phone === 'string' ? body.client_phone.trim() : '';
  const matterTitle = typeof body.matter_title === 'string' ? body.matter_title.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (!firstName || !lastName) {
    return res.status(400).json({ ok: false, error: 'Client first and last name are required' });
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
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }

  const clientName = `${firstName} ${lastName}`.trim();
  const summaryParts: string[] = [];

  if (matterTitle) summaryParts.push(`Matter: ${matterTitle}`);
  if (email) summaryParts.push(`Email: ${email}`);
  if (phone) summaryParts.push(`Phone: ${phone}`);
  if (notes) summaryParts.push(notes);

  const intakeSummary = summaryParts.length > 0 ? summaryParts.join('\n') : null;

  const { data: inserted, error: insertError } = await adminClient
    .from('cases')
    .insert({
      firm_id: membership.firm_id,
      client_name: clientName,
      matter_type: 'divorce',
      status: 'open',
      intake_summary: intakeSummary,
      last_activity_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to create case' });
  }

  return res.status(200).json({ ok: true, caseId: inserted.id });
}
