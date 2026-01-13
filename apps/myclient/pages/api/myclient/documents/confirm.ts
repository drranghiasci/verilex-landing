import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { canUploadDocument } from '@/lib/plans';
import {
  CASE_DOCUMENT_TYPE_ALLOWLIST,
  isAllowedDocumentType,
  isAllowedMimeType,
  MAX_UPLOAD_BYTES,
} from '../../../../../../lib/documents/uploadPolicy';

type ConfirmBody = {
  caseId?: string;
  storage_path?: string;
  filename?: string;
  mime_type?: string;
  size_bytes?: number;
  display_name?: string;
  doc_type?: string;
  tags?: string[];
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
  ok: true;
  document: {
    id: string;
    case_id: string;
    storage_path: string;
    filename: string;
    created_at: string;
  };
};

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

  const body = (req.body ?? {}) as ConfirmBody;
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  const storagePath = typeof body.storage_path === 'string' ? body.storage_path.trim() : '';
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';

  if (!UUID_RE.test(caseId)) {
    return res.status(400).json({ ok: false, error: 'Invalid case id' });
  }
  if (!storagePath) {
    return res.status(400).json({ ok: false, error: 'storage_path is required' });
  }
  if (!filename) {
    return res.status(400).json({ ok: false, error: 'filename is required' });
  }

  if (!isAllowedMimeType(body.mime_type || null)) {
    return res.status(415).json({ ok: false, error: 'Unsupported file type.' });
  }

  if (typeof body.size_bytes === 'number' && body.size_bytes > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: 'File exceeds 25MB limit.' });
  }

  const docType = typeof body.doc_type === 'string' ? body.doc_type.trim() : '';
  if (!isAllowedDocumentType(docType || null, CASE_DOCUMENT_TYPE_ALLOWLIST)) {
    return res.status(400).json({ ok: false, error: 'doc_type is invalid' });
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
    return res.status(403).json({ ok: false, error: 'You do not have permission to upload documents.' });
  }

  const { data: caseRows, error: caseError } = await adminClient
    .from('cases')
    .select('id, firm_id')
    .eq('id', caseId)
    .limit(1);

  if (caseError) {
    return res.status(500).json({ ok: false, error: caseError.message });
  }

  const caseRow = Array.isArray(caseRows) && caseRows.length > 0 ? caseRows[0] : null;
  if (!caseRow || caseRow.firm_id !== membership.firm_id) {
    return res.status(404).json({ ok: false, error: 'Case not found' });
  }

  const expectedPrefix = `${membership.firm_id}/cases/${caseId}/documents/`;
  if (!storagePath.startsWith(expectedPrefix)) {
    return res.status(400).json({ ok: false, error: 'storage_path is invalid' });
  }

  const { data: firmRow, error: firmError } = await adminClient
    .from('firms')
    .select('plan')
    .eq('id', membership.firm_id)
    .single();

  if (firmError) {
    return res.status(500).json({ ok: false, error: firmError.message });
  }

  const { count: documentCount, error: countError } = await adminClient
    .from('case_documents')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', membership.firm_id)
    .is('deleted_at', null);

  if (countError) {
    return res.status(500).json({ ok: false, error: countError.message });
  }

  const plan = (firmRow?.plan as 'free' | 'pro' | 'enterprise' | undefined) ?? 'free';
  const limitCheck = canUploadDocument({ plan, currentDocumentCount: documentCount ?? 0 });
  if (!limitCheck.ok) {
    return res.status(403).json({ ok: false, error: `${limitCheck.reason} Upgrade to Pro to upload more documents.` });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
    : [];

  const { data: insertedDoc, error: insertError } = await adminClient
    .from('case_documents')
    .insert({
      firm_id: membership.firm_id,
      case_id: caseId,
      storage_path: storagePath,
      filename,
      mime_type: body.mime_type ?? null,
      size_bytes: typeof body.size_bytes === 'number' ? body.size_bytes : null,
      uploaded_by: authData.user.id,
      uploaded_by_role: 'firm',
      display_name: typeof body.display_name === 'string' ? body.display_name.trim() : null,
      doc_type: docType || 'other',
      tags,
    })
    .select('id, case_id, storage_path, filename, created_at')
    .single();

  if (insertError || !insertedDoc) {
    return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to save document' });
  }

  try {
    await adminClient.from('case_activity').insert({
      firm_id: membership.firm_id,
      case_id: caseId,
      actor_user_id: authData.user.id,
      event_type: 'document_uploaded',
      message: `Document uploaded: ${insertedDoc.filename}`,
      metadata: { file_name: insertedDoc.filename },
    });
  } catch {
    // best-effort logging
  }

  return res.status(200).json({ ok: true, document: insertedDoc });
}
