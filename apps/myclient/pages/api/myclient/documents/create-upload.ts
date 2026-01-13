import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { canUploadDocument } from '@/lib/plans';
import { isAllowedMimeType, MAX_UPLOAD_BYTES } from '../../../../../../lib/documents/uploadPolicy';

type CreateUploadBody = {
  caseId?: string;
  filename?: string;
  content_type?: string;
  size_bytes?: number;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
  ok: true;
  storage_path: string;
  signed_url: string;
  expires_in: number;
};

const UUID_RE = /^[0-9a-fA-F-]{36}$/;
const DOCUMENTS_BUCKET = process.env.VERILEX_DOCUMENTS_BUCKET || 'case-documents';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2;

function sanitizeFilename(name: string) {
  const trimmed = name.replace(/[/\\]/g, '').trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 0 ? safe : 'document';
}

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

  const body = (req.body ?? {}) as CreateUploadBody;
  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  const filename = typeof body.filename === 'string' ? body.filename.trim() : '';

  if (!UUID_RE.test(caseId)) {
    return res.status(400).json({ ok: false, error: 'Invalid case id' });
  }

  if (!filename) {
    return res.status(400).json({ ok: false, error: 'filename is required' });
  }

  if (!isAllowedMimeType(body.content_type || null)) {
    return res.status(415).json({ ok: false, error: 'Unsupported file type.' });
  }

  if (typeof body.size_bytes === 'number' && body.size_bytes > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: 'File exceeds 25MB limit.' });
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

  const safeFilename = sanitizeFilename(filename);
  const storagePath = `${membership.firm_id}/cases/${caseId}/documents/${randomUUID()}-${safeFilename}`;

  const { data: signedData, error: signedError } = await adminClient.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (signedError || !signedData?.signedUrl) {
    return res.status(500).json({ ok: false, error: signedError?.message || 'Unable to create upload URL' });
  }

  return res.status(200).json({
    ok: true,
    storage_path: storagePath,
    signed_url: signedData.signedUrl,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
}
