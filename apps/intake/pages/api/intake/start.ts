import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { createIntakeToken } from '../../../../../lib/server/intakeToken';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from './_utils';

const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type StartBody = {
  firm_slug?: string;
  matter_type?: string;
  urgency_level?: string;
  intake_channel?: string;
  language_preference?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  const bodyResult = parseJsonBody<StartBody>(req, requestId);
  if (!bodyResult.ok) {
    sendError(res, bodyResult.status, bodyResult.error, requestId);
    return;
  }

  const body = bodyResult.data ?? {};
  const firmSlug = typeof body.firm_slug === 'string' ? body.firm_slug.trim() : '';
  if (!firmSlug) {
    sendError(res, 400, 'firm_slug is required', requestId);
    return;
  }
  if (!SLUG_FORMAT.test(firmSlug)) {
    sendError(res, 400, 'Invalid firm_slug format', requestId);
    return;
  }

  const { data: firm, error: firmError } = await supabaseAdmin
    .from('firms')
    .select('id, name, slug')
    .eq('slug', firmSlug)
    .maybeSingle();

  if (firmError) {
    sendError(res, 500, 'Unable to resolve firm', requestId);
    return;
  }

  if (!firm?.id) {
    sendError(res, 404, 'Firm not found', requestId);
    return;
  }

  const insertRow = {
    firm_id: firm.id,
    status: 'draft',
    raw_payload: {},
    intake_channel: toStringOrNull(body.intake_channel),
    matter_type: toStringOrNull(body.matter_type),
    urgency_level: toStringOrNull(body.urgency_level),
    language_preference: toStringOrNull(body.language_preference),
  };

  const { data, error } = await supabaseAdmin
    .from('intakes')
    .insert(insertRow)
    .select('id')
    .single();

  if (error || !data) {
    sendError(res, 500, 'Failed to start intake', requestId);
    return;
  }

  const token = createIntakeToken({ firmId: firm.id, intakeId: data.id });
  const canonicalSlug = typeof firm.slug === 'string' && firm.slug.trim() ? firm.slug.trim() : firmSlug;
  const resumePath = `/intake/${canonicalSlug}/resume/${encodeURIComponent(token)}`;

  return res.status(200).json({
    ok: true,
    token,
    resumePath,
  });
}
