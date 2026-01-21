import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import { normalizePayloadToDocxV1 } from '../../../../../lib/intake/normalizePayload';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from '@/lib/apiUtils';

function extractToken(req: NextApiRequest, body?: { token?: string } | null): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  const headerToken = req.headers['x-intake-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }

  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  const bodyToken = body?.token;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim();
  }

  return '';
}

type LoadBody = {
  intakeId?: string;
  token?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['GET', 'POST'], requestId)) {
    return;
  }

  const bodyResult = req.method === 'POST'
    ? parseJsonBody<LoadBody>(req, requestId, { allowEmpty: true })
    : ({ ok: true, data: {} as LoadBody } as const);
  if (!bodyResult.ok) {
    sendError(res, bodyResult.status, bodyResult.error, requestId);
    return;
  }

  const body = bodyResult.data ?? {};
  const intakeIdParam =
    typeof req.query.intakeId === 'string'
      ? req.query.intakeId
      : (typeof body.intakeId === 'string' ? body.intakeId : '');

  const token = extractToken(req, body);
  if (!token) {
    sendError(res, 401, 'Missing intake token', requestId);
    return;
  }

  const tokenResult = verifyIntakeToken(token);
  if (!tokenResult.ok) {
    sendError(res, tokenResult.status, tokenResult.error, requestId);
    return;
  }

  const intakeId = intakeIdParam || tokenResult.payload.intake_id;
  if (!intakeId) {
    sendError(res, 400, 'intakeId is required', requestId);
    return;
  }
  if (intakeIdParam && intakeIdParam !== tokenResult.payload.intake_id) {
    sendError(res, 403, 'Intake token does not match intake', requestId);
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, status, submitted_at, raw_payload, updated_at, created_at, matter_type, urgency_level, intake_channel, language_preference, current_step_key, completed_step_keys, step_status')
    .eq('id', intakeId)
    .eq('firm_id', tokenResult.payload.firm_id)
    .maybeSingle();

  if (error) {
    sendError(res, 500, 'Unable to load intake', requestId);
    return;
  }

  if (!data) {
    sendError(res, 404, 'Intake not found', requestId);
    return;
  }

  const locked = Boolean(data.submitted_at);

  const messagesPromise = supabaseAdmin
    .from('intake_messages')
    .select('seq, source, channel, content, content_structured, created_at')
    .eq('intake_id', data.id)
    .eq('firm_id', tokenResult.payload.firm_id)
    .order('seq', { ascending: true });

  const documentsPromise = locked
    ? Promise.resolve({ data: [] as Record<string, unknown>[], error: null })
    : supabaseAdmin
      .from('intake_documents')
      .select('storage_object_path, document_type, classification, created_at, mime_type, size_bytes, uploaded_by_role')
      .eq('intake_id', data.id)
      .eq('firm_id', tokenResult.payload.firm_id)
      .order('created_at', { ascending: true });

  const [messagesResult, documentsResult] = await Promise.all([messagesPromise, documentsPromise]);

  if (messagesResult.error) {
    sendError(res, 500, 'Unable to load intake messages', requestId);
    return;
  }

  if (documentsResult.error) {
    sendError(res, 500, 'Unable to load intake documents', requestId);
    return;
  }

  const normalizedPayload = normalizePayloadToDocxV1(data.raw_payload ?? {});
  const rawPayload = (data.raw_payload ?? {}) as Record<string, unknown>;
  const intakeType = typeof rawPayload.intake_type === 'string' ? rawPayload.intake_type : null;

  return res.status(200).json({
    ok: true,
    intake: {
      id: data.id,
      status: data.status,
      submitted_at: data.submitted_at,
      raw_payload: normalizedPayload,
      intake_type: intakeType,
      matter_type: data.matter_type,
      urgency_level: data.urgency_level,
      intake_channel: data.intake_channel,
      language_preference: data.language_preference,
      updated_at: data.updated_at,
      created_at: data.created_at,
      // Orchestrator state for sidebar
      current_step_key: data.current_step_key ?? null,
      completed_step_keys: data.completed_step_keys ?? [],
      step_status: data.step_status ?? {},
    },
    messages: messagesResult.data ?? [],
    documents: documentsResult.data ?? [],
    locked,
  });
}
