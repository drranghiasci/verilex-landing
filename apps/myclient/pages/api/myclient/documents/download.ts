import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type DownloadBody = { documentId?: string };

type ErrorResponse = { ok: false; error: string };

type SuccessResponse = { ok: true; url: string };

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

  const body = (req.body ?? {}) as DownloadBody;
  const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
  if (!UUID_RE.test(documentId)) {
    return res.status(400).json({ ok: false, error: 'Invalid document id' });
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

  const { data: documentRows, error: documentError } = await adminClient
    .from('case_documents')
    .select('id, firm_id, storage_path')
    .eq('id', documentId)
    .limit(1);

  if (documentError) {
    return res.status(500).json({ ok: false, error: documentError.message });
  }

  const documentRow = Array.isArray(documentRows) && documentRows.length > 0 ? documentRows[0] : null;
  if (!documentRow || documentRow.firm_id !== membership.firm_id) {
    return res.status(404).json({ ok: false, error: 'Document not found' });
  }

  const { data: signedData, error: signedError } = await adminClient.storage
    .from('case-documents')
    .createSignedUrl(documentRow.storage_path, 600);

  if (signedError || !signedData?.signedUrl) {
    return res.status(500).json({ ok: false, error: signedError?.message || 'Unable to create download link' });
  }

  return res.status(200).json({ ok: true, url: signedData.signedUrl });
}
