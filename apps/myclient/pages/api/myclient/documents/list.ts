import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type DocumentRow = {
  id: string;
  case_id: string;
  filename: string;
  created_at: string;
};

type CaseRow = {
  id: string;
  client_name: string | null;
};

type ErrorResponse = { ok: false; error: string };

type SuccessResponse = { ok: true; documents: DocumentRow[]; cases: CaseRow[] };

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

  const { data: documents, error: documentsError } = await adminClient
    .from('case_documents')
    .select('id, case_id, filename, created_at')
    .eq('firm_id', membership.firm_id)
    .order('created_at', { ascending: false });

  if (documentsError) {
    return res.status(500).json({ ok: false, error: documentsError.message });
  }

  const { data: cases, error: casesError } = await adminClient
    .from('cases')
    .select('id, client_name')
    .eq('firm_id', membership.firm_id);

  if (casesError) {
    return res.status(500).json({ ok: false, error: casesError.message });
  }

  return res.status(200).json({
    ok: true,
    documents: (documents ?? []) as DocumentRow[],
    cases: (cases ?? []) as CaseRow[],
  });
}
