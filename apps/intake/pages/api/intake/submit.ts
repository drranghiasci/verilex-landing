import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../lib/intake/schema/gaDivorceCustodyV1';
import { normalizePayloadToDocxV1 } from '../../../../../lib/intake/normalizePayload';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from '@/lib/apiUtils';

const allowedFieldKeys = new Set(
  GA_DIVORCE_CUSTODY_V1.sections.flatMap((section) =>
    section.fields.filter((field) => !field.isSystem).map((field) => field.key),
  ),
);

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizePatch(input: Record<string, unknown>) {
  const unknownKeys: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (!allowedFieldKeys.has(key)) {
      unknownKeys.push(key);
      continue;
    }
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return { sanitized, unknownKeys };
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildClientDisplayName(payload: Record<string, unknown>): string | null {
  const first = toStringOrNull(payload.client_first_name);
  const last = toStringOrNull(payload.client_last_name);
  if (!first && !last) return null;
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

type SubmitBody = {
  intakeId?: string;
  patch?: Record<string, unknown>;
  token?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  const bodyResult = parseJsonBody<SubmitBody>(req, requestId);
  if (!bodyResult.ok) {
    sendError(res, bodyResult.status, bodyResult.error, requestId);
    return;
  }

  const token = extractToken(req, bodyResult.data);
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
  const intakeId = typeof body.intakeId === 'string' ? body.intakeId : '';
  if (!intakeId) {
    sendError(res, 400, 'intakeId is required', requestId);
    return;
  }
  if (intakeId !== tokenResult.payload.intake_id) {
    sendError(res, 403, 'Intake token does not match intake', requestId);
    return;
  }

  const patchInput = body.patch ?? {};
  if (!isPlainObject(patchInput)) {
    sendError(res, 400, 'patch must be an object', requestId);
    return;
  }

  const { sanitized, unknownKeys } = sanitizePatch(patchInput);
  if (unknownKeys.length > 0) {
    sendError(res, 400, `Unknown intake fields: ${unknownKeys.join(', ')}`, requestId);
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
    return res.status(200).json({ ok: true, locked: true, submitted_at: intake.submitted_at });
  }

  const updateRow: Record<string, unknown> = {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };

  if (Object.keys(sanitized).length > 0) {
    const existingPayload = isPlainObject(intake.raw_payload) ? intake.raw_payload : {};
    const nextPayload = normalizePayloadToDocxV1({ ...existingPayload, ...sanitized });
    updateRow.raw_payload = nextPayload;

    if (sanitized.intake_channel !== undefined) {
      updateRow.intake_channel = toStringOrNull(sanitized.intake_channel);
    }
    if (sanitized.matter_type !== undefined) {
      updateRow.matter_type = toStringOrNull(sanitized.matter_type);
    }
    if (sanitized.urgency_level !== undefined) {
      updateRow.urgency_level = toStringOrNull(sanitized.urgency_level);
    }
    if (sanitized.language_preference !== undefined) {
      updateRow.language_preference = toStringOrNull(sanitized.language_preference);
    }

    const displayName = buildClientDisplayName(nextPayload);
    if (displayName) {
      updateRow.client_display_name = displayName;
    }
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('intakes')
    .update(updateRow)
    .eq('id', intakeId)
    .eq('firm_id', tokenResult.payload.firm_id)
    .is('submitted_at', null)
    .select('id, submitted_at')
    .maybeSingle();

  if (updateError) {
    if (updateError.message.includes('INTAKE_IMMUTABLE')) {
      return res.status(409).json({ ok: false, locked: true, requestId });
    }
    sendError(res, 500, 'Unable to submit intake', requestId);
    return;
  }
  if (!updated) {
    return res.status(409).json({ ok: false, locked: true, requestId });
  }

  return res.status(200).json({ ok: true, locked: true, submitted_at: updated.submitted_at });
}
