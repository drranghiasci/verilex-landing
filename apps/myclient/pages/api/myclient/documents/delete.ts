import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type DeleteBody = { documentId?: string };

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true };

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const DOCUMENTS_BUCKET = process.env.VERILEX_DOCUMENTS_BUCKET || 'case-documents';

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

  const body = (req.body ?? {}) as DeleteBody;
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

  const { data: documents, error: docError } = await adminClient
    .from('case_documents')
    .select('id, firm_id, case_id, storage_path, filename, display_name')
    .eq('id', documentId)
    .limit(1);

  if (docError) {
    return res.status(500).json({ ok: false, error: docError.message });
  }

  const doc = Array.isArray(documents) && documents.length > 0 ? documents[0] : null;
  if (!doc || doc.firm_id !== membership.firm_id) {
    return res.status(404).json({ ok: false, error: 'Document not found' });
  }

  const { error: storageError } = await adminClient.storage
    .from(DOCUMENTS_BUCKET)
    .remove([doc.storage_path]);

  if (storageError) {
    return res.status(500).json({ ok: false, error: storageError.message });
  }

  const { error: updateError } = await adminClient
    .from('case_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', documentId);

  if (updateError) {
    return res.status(500).json({ ok: false, error: updateError.message });
  }

  try {
    await adminClient.from('case_activity').insert({
      firm_id: membership.firm_id,
      case_id: doc.case_id,
      actor_user_id: authData.user.id,
      event_type: 'document_deleted',
      message: `Document deleted: ${doc.display_name || doc.filename}`,
      metadata: { file_name: doc.filename },
    });
  } catch {
    // best-effort logging
  }

  return res.status(200).json({ ok: true });
}
