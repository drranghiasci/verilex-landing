import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

type JsonParseOptions = {
  allowEmpty?: boolean;
  limitBytes?: number;
};

type JsonParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export function getRequestId(req: NextApiRequest): string {
  const header = req.headers['x-request-id'] ?? req.headers['x-correlation-id'];
  if (Array.isArray(header)) {
    const value = header.find((entry) => entry.trim());
    if (value) return value.trim();
  }
  if (typeof header === 'string' && header.trim()) {
    return header.trim();
  }
  return crypto.randomUUID();
}

export function logRequestStart(req: NextApiRequest, requestId: string) {
  const path = req.url ? req.url.split('?')[0] : '';
  console.info(`[intake-api] ${req.method ?? 'UNKNOWN'} ${path} requestId=${requestId}`);
}

export function logRequestError(
  requestId: string,
  status: number,
  message: string,
  detail?: string,
) {
  const suffix = detail ? ` detail="${detail}"` : '';
  console.error(`[intake-api] requestId=${requestId} status=${status} message="${message}"${suffix}`);
}

export function sendError(
  res: NextApiResponse,
  status: number,
  message: string,
  requestId: string,
  detail?: string,
) {
  logRequestError(requestId, status, message, detail);
  return res.status(status).json({ ok: false, error: message, requestId });
}

export function requireMethod(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: string[],
  requestId: string,
) {
  if (!req.method || !allowed.includes(req.method)) {
    res.setHeader('Allow', allowed);
    sendError(res, 405, 'Method not allowed', requestId);
    return false;
  }
  return true;
}

export function parseJsonBody<T>(
  req: NextApiRequest,
  requestId: string,
  options: JsonParseOptions = {},
): JsonParseResult<T> {
  const limitBytes = options.limitBytes ?? DEFAULT_BODY_LIMIT_BYTES;
  const body = req.body ?? (options.allowEmpty ? {} : undefined);

  if (body === undefined) {
    return { ok: false, status: 400, error: 'Request body required' };
  }

  if (typeof body === 'string') {
    if (Buffer.byteLength(body, 'utf8') > limitBytes) {
      return { ok: false, status: 413, error: 'Request body too large' };
    }
    try {
      return { ok: true, data: JSON.parse(body) as T };
    } catch {
      return { ok: false, status: 400, error: 'Invalid JSON body' };
    }
  }

  const size = Buffer.byteLength(JSON.stringify(body), 'utf8');
  if (size > limitBytes) {
    return { ok: false, status: 413, error: 'Request body too large' };
  }

  return { ok: true, data: body as T };
}
