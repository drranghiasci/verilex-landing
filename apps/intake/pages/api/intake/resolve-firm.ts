import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import {
  getRequestId,
  logRequestStart,
  parseJsonBody,
  requireMethod,
  sendError,
} from '@/lib/apiUtils';

const SLUG_FORMAT = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;

type ResolveFirmBody = {
  firm_slug?: string;
};

type BrandingPayload = {
  logo_url?: string;
  accent_color?: string;
};

type BrandingSource = {
  logo_url?: unknown;
  accent_color?: unknown;
};

function toSafeBranding(input: unknown): BrandingPayload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  const source = input as BrandingSource;
  const logoUrl = typeof source.logo_url === 'string' && source.logo_url.trim().length <= 512
    ? source.logo_url.trim()
    : undefined;
  const accentColor = typeof source.accent_color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(source.accent_color)
    ? source.accent_color
    : undefined;

  return {
    ...(logoUrl ? { logo_url: logoUrl } : {}),
    ...(accentColor ? { accent_color: accentColor } : {}),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const requestId = getRequestId(req);
  logRequestStart(req, requestId);

  if (!requireMethod(req, res, ['POST'], requestId)) {
    return;
  }

  const bodyResult = parseJsonBody<ResolveFirmBody>(req, requestId);
  if (!bodyResult.ok) {
    sendError(res, bodyResult.status, bodyResult.error, requestId);
    return;
  }

  const slug = typeof bodyResult.data.firm_slug === 'string'
    ? bodyResult.data.firm_slug.trim()
    : '';
  if (!slug) {
    sendError(res, 400, 'firm_slug is required', requestId);
    return;
  }
  if (!SLUG_FORMAT.test(slug)) {
    sendError(res, 400, 'Invalid firm_slug format', requestId);
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('firms')
    .select('id, name, slug, branding')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    sendError(res, 500, 'Unable to resolve firm', requestId);
    return;
  }

  if (!data?.id || !data.name) {
    sendError(res, 404, 'Firm not found', requestId);
    return;
  }

  const safeBranding = toSafeBranding(data.branding);

  return res.status(200).json({
    ok: true,
    firm_id: data.id,
    firm_name: data.name,
    branding: safeBranding,
  });
}
