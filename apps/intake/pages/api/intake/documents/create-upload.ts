import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../../lib/server/intakeToken';
import { createSignedUploadUrl } from '../../../../../../lib/server/storage';
import { isAllowedMimeType, MAX_UPLOAD_BYTES } from '../../../../../../lib/documents/uploadPolicy';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from '@/lib/apiUtils';

const DOCUMENTS_BUCKET = process.env.VERILEX_DOCUMENTS_BUCKET;

type CreateUploadBody = {
  intakeId?: string;
  filename?: string;
  content_type?: string;
  size_bytes?: number;
};

function sanitizeFilename(name: string) {
  const base = name.split('/').pop() ?? name;
  const safe = base.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const trimmed = safe.replace(/-+/g, '-').replace(/^\.+/, '').replace(/^-+/, '');
  return trimmed || 'document';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  if (!DOCUMENTS_BUCKET) {
    sendError(res, 500, 'Document storage bucket is not configured', requestId);
    return;
  }

  const bodyResult = parseJsonBody<CreateUploadBody>(req, requestId);
  if (!bodyResult.ok) {
    sendError(res, bodyResult.status, bodyResult.error, requestId);
    return;
  }

  const tokenHeader = req.headers.authorization;
  const token = tokenHeader?.startsWith('Bearer ')
    ? tokenHeader.slice('Bearer '.length).trim()
    : '';

  if (!token) {
    sendError(res, 401, 'Missing intake token', requestId);
    return;
  }

  const tokenResult = verifyIntakeToken(token);
  if (!tokenResult.ok) {
    sendError(res, tokenResult.status, tokenResult.error, requestId);
    return;
  }

  const body = bodyResult.data ?? {};
  const intakeId = typeof body.intakeId === 'string' && body.intakeId.trim()
    ? body.intakeId.trim()
    : tokenResult.payload.intake_id;

  if (intakeId !== tokenResult.payload.intake_id) {
    sendError(res, 403, 'Intake token does not match intake', requestId);
    return;
  }

  if (typeof body.filename !== 'string' || !body.filename.trim()) {
    sendError(res, 400, 'filename is required', requestId);
    return;
  }

  if (!isAllowedMimeType(body.content_type)) {
    sendError(res, 415, 'Unsupported file type', requestId);
    return;
  }

  if (typeof body.size_bytes === 'number' && body.size_bytes > MAX_UPLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: 'File exceeds 25MB limit.', requestId });
  }

  const { data: intake, error: intakeError } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, status, submitted_at')
    .eq('id', intakeId)
    .eq('firm_id', tokenResult.payload.firm_id)
    .maybeSingle();

  if (intakeError) {
    sendError(res, 500, 'Unable to load intake', requestId);
    return;
  }

  if (!intake) {
    sendError(res, 404, 'Intake not found', requestId);
    return;
  }

  if (intake.submitted_at || intake.status === 'submitted') {
    return res.status(409).json({ ok: false, locked: true, requestId });
  }

  const documentId = crypto.randomUUID();
  const safeFilename = sanitizeFilename(body.filename);
  const storagePath = `${tokenResult.payload.firm_id}/intakes/${intakeId}/documents/${documentId}-${safeFilename}`;

  try {
    const signed = await createSignedUploadUrl({
      bucket: DOCUMENTS_BUCKET,
      path: storagePath,
    });

    return res.status(200).json({
      ok: true,
      storage_object_path: storagePath,
      signed_url: signed.signedUrl,
      expires_in: signed.expiresIn,
    });
  } catch (error) {
    sendError(res, 500, 'Unable to create upload URL', requestId);
  }
}
