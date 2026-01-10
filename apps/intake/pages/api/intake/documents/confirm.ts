import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../../lib/server/intakeToken';
import { normalizePayloadToDocxV1 } from '../../../../../../lib/intake/normalizePayload';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from '../_utils';

type ConfirmUploadBody = {
  intakeId?: string;
  storage_object_path?: string;
  document_type?: string;
  classification?: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  const bodyResult = parseJsonBody<ConfirmUploadBody>(req, requestId);
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

  if (typeof body.storage_object_path !== 'string' || !body.storage_object_path.trim()) {
    sendError(res, 400, 'storage_object_path is required', requestId);
    return;
  }

  const expectedPrefix = `${tokenResult.payload.firm_id}/intakes/${intakeId}/documents/`;
  if (!body.storage_object_path.startsWith(expectedPrefix)) {
    sendError(res, 400, 'storage_object_path is invalid', requestId);
    return;
  }

  const { data: intake, error: intakeError } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, status, submitted_at, raw_payload')
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

  const documentType = typeof body.document_type === 'string' ? body.document_type.trim() : null;
  const classification = isPlainObject(body.classification) ? body.classification : {};

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('intake_documents')
    .insert({
      firm_id: tokenResult.payload.firm_id,
      intake_id: intakeId,
      storage_object_path: body.storage_object_path,
      document_type: documentType,
      classification,
    })
    .select('storage_object_path, document_type, classification, created_at')
    .single();

  if (insertError || !inserted) {
    sendError(res, 500, 'Unable to save document metadata', requestId);
    return;
  }

  const existingPayload = isPlainObject(intake.raw_payload) ? intake.raw_payload : {};
  const nextPayload = normalizePayloadToDocxV1({ ...existingPayload, uploaded: true });
  const { error: updateError } = await supabaseAdmin
    .from('intakes')
    .update({ raw_payload: nextPayload })
    .eq('id', intakeId)
    .eq('firm_id', tokenResult.payload.firm_id)
    .is('submitted_at', null);

  if (updateError) {
    sendError(res, 500, 'Unable to update intake evidence status', requestId);
    return;
  }

  return res.status(200).json(inserted);
}
