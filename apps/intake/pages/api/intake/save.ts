import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';
import { allocateMessageSeqRange } from '../../../../../lib/server/seq';
import { mergePatch } from '../../../../../lib/server/patchMerge';
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

type MessageInput = {
  source: string;
  channel: string;
  content: string;
  content_structured?: Record<string, unknown>;
};

type DocumentInput = {
  storage_object_path: string;
  document_type?: string;
  classification?: Record<string, unknown>;
};

type NormalizeResult<T> =
  | { rows: T[] }
  | { error: string };

type SaveBody = {
  intakeId?: string;
  patch?: Record<string, unknown>;
  messages?: MessageInput[];
  documents?: DocumentInput[];
  token?: string;
};

function normalizeMessages(input: unknown): NormalizeResult<MessageInput> {
  if (input === undefined) return { rows: [] as MessageInput[] };
  if (!Array.isArray(input)) return { error: 'messages must be an array' };

  const rows: MessageInput[] = [];
  for (const entry of input) {
    if (!isPlainObject(entry)) return { error: 'messages entries must be objects' };
    if (typeof entry.source !== 'string' || !entry.source.trim()) {
      return { error: 'messages.source is required' };
    }
    if (typeof entry.channel !== 'string' || !entry.channel.trim()) {
      return { error: 'messages.channel is required' };
    }
    if (typeof entry.content !== 'string' || !entry.content.trim()) {
      return { error: 'messages.content is required' };
    }
    const contentStructured = isPlainObject(entry.content_structured)
      ? entry.content_structured
      : undefined;

    rows.push({
      source: entry.source.trim(),
      channel: entry.channel.trim(),
      content: entry.content,
      content_structured: contentStructured,
    });
  }

  return { rows };
}

function normalizeDocuments(input: unknown): NormalizeResult<DocumentInput> {
  if (input === undefined) return { rows: [] as DocumentInput[] };
  if (!Array.isArray(input)) return { error: 'documents must be an array' };

  const rows: DocumentInput[] = [];
  for (const entry of input) {
    if (!isPlainObject(entry)) return { error: 'documents entries must be objects' };
    if (typeof entry.storage_object_path !== 'string' || !entry.storage_object_path.trim()) {
      return { error: 'documents.storage_object_path is required' };
    }
    const documentType = typeof entry.document_type === 'string' ? entry.document_type.trim() : undefined;
    const classification = isPlainObject(entry.classification) ? entry.classification : undefined;

    rows.push({
      storage_object_path: entry.storage_object_path.trim(),
      document_type: documentType,
      classification,
    });
  }

  return { rows };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  const bodyResult = parseJsonBody<SaveBody>(req, requestId);
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

  const messageResult = normalizeMessages(body.messages);
  if ('error' in messageResult) {
    sendError(res, 400, messageResult.error, requestId);
    return;
  }

  const documentResult = normalizeDocuments(body.documents);
  if ('error' in documentResult) {
    sendError(res, 400, documentResult.error, requestId);
    return;
  }

  const { merged: sanitizedPatch, unknownKeys } = mergePatch({}, patchInput, allowedFieldKeys);
  if (unknownKeys.length > 0) {
    sendError(res, 400, `Unknown intake fields: ${unknownKeys.join(', ')}`, requestId);
    return;
  }

  if (
    Object.keys(sanitizedPatch).length === 0
    && messageResult.rows.length === 0
    && documentResult.rows.length === 0
  ) {
    sendError(res, 400, 'No changes provided', requestId);
    return;
  }

  const { data: intake, error: intakeError } = await supabaseAdmin
    .from('intakes')
    .select('id, firm_id, status, submitted_at, raw_payload, updated_at')
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

  let updatedAt: string | null = intake.updated_at ?? null;
  if (Object.keys(sanitizedPatch).length > 0) {
    const existingPayload = isPlainObject(intake.raw_payload) ? intake.raw_payload : {};
    const { merged: mergedPayload } = mergePatch(existingPayload, sanitizedPatch, allowedFieldKeys);
    const nextPayload = normalizePayloadToDocxV1(mergedPayload);

    const updateRow: Record<string, unknown> = {
      raw_payload: nextPayload,
    };

    if (sanitizedPatch.intake_channel !== undefined) {
      updateRow.intake_channel = toStringOrNull(sanitizedPatch.intake_channel);
    }
    if (sanitizedPatch.matter_type !== undefined) {
      updateRow.matter_type = toStringOrNull(sanitizedPatch.matter_type);
    }
    if (sanitizedPatch.urgency_level !== undefined) {
      updateRow.urgency_level = toStringOrNull(sanitizedPatch.urgency_level);
    }
    if (sanitizedPatch.language_preference !== undefined) {
      updateRow.language_preference = toStringOrNull(sanitizedPatch.language_preference);
    }

    const displayName = buildClientDisplayName(nextPayload);
    if (displayName) {
      updateRow.client_display_name = displayName;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('intakes')
      .update(updateRow)
      .eq('id', intakeId)
      .eq('firm_id', tokenResult.payload.firm_id)
      .is('submitted_at', null)
      .select('id, updated_at')
      .maybeSingle();

    if (updateError) {
      if (updateError.message.includes('INTAKE_IMMUTABLE')) {
        return res.status(409).json({ ok: false, locked: true, requestId });
      }
      sendError(res, 500, 'Unable to save intake', requestId);
      return;
    }

    if (!updated) {
      return res.status(409).json({ ok: false, locked: true, requestId });
    }

    updatedAt = typeof updated.updated_at === 'string' ? updated.updated_at : updatedAt;
  }

  let lastSeq: number | null = null;
  if (messageResult.rows.length > 0) {
    const allocateRows = async () => {
      const { startSeq, lastSeq: allocatedLastSeq } = await allocateMessageSeqRange(
        supabaseAdmin,
        intakeId,
        tokenResult.payload.firm_id,
        messageResult.rows.length,
      );

      const messageRows = messageResult.rows.map((row, index) => ({
        firm_id: tokenResult.payload.firm_id,
        intake_id: intakeId,
        seq: startSeq + index,
        source: row.source,
        channel: row.channel,
        content: row.content,
        content_structured: row.content_structured ?? {},
      }));

      return { messageRows, allocatedLastSeq };
    };

    let allocation = await allocateRows();
    let { error: messageError } = await supabaseAdmin.from('intake_messages').insert(allocation.messageRows);
    if (messageError?.code === '23505') {
      allocation = await allocateRows();
      ({ error: messageError } = await supabaseAdmin.from('intake_messages').insert(allocation.messageRows));
    }
    if (messageError) {
      sendError(res, 500, 'Unable to save messages', requestId);
      return;
    }
    lastSeq = allocation.allocatedLastSeq;
  }

  if (documentResult.rows.length > 0) {
    const documentRows = documentResult.rows.map((row) => ({
      firm_id: tokenResult.payload.firm_id,
      intake_id: intakeId,
      storage_object_path: row.storage_object_path,
      document_type: row.document_type ?? null,
      classification: row.classification ?? {},
    }));

    const { error: documentError } = await supabaseAdmin.from('intake_documents').insert(documentRows);
    if (documentError) {
      sendError(res, 500, 'Unable to save documents', requestId);
      return;
    }
  }

  return res.status(200).json({ ok: true, updated_at: updatedAt, last_seq: lastSeq });
}
