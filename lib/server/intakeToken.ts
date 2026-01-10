import crypto from 'crypto';

if (typeof window !== 'undefined') {
  throw new Error('intakeToken is server-only');
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

const INTAKE_TOKEN_SECRET = getRequiredEnv('INTAKE_TOKEN_SECRET');

const TOKEN_VERSION = 1;
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type IntakeTokenPayload = {
  firm_id: string;
  intake_id: string;
  exp: number;
  v: number;
};

type VerifyResult =
  | { ok: true; payload: IntakeTokenPayload }
  | { ok: false; status: number; error: string };

function base64UrlEncode(input: Buffer | string) {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Buffer.from(padded, 'base64');
}

function signPayload(payloadB64: string) {
  const signature = crypto
    .createHmac('sha256', INTAKE_TOKEN_SECRET)
    .update(payloadB64)
    .digest();
  return base64UrlEncode(signature);
}

export function createIntakeToken(params: {
  firmId: string;
  intakeId: string;
  expiresInSeconds?: number;
}) {
  const exp = Math.floor(Date.now() / 1000)
    + (params.expiresInSeconds ?? DEFAULT_TOKEN_TTL_SECONDS);

  const payload: IntakeTokenPayload = {
    firm_id: params.firmId,
    intake_id: params.intakeId,
    exp,
    v: TOKEN_VERSION,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signatureB64 = signPayload(payloadB64);
  return `${payloadB64}.${signatureB64}`;
}

export function verifyIntakeToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  const [payloadB64, signatureB64] = parts;
  const expectedSignature = signPayload(payloadB64);

  const signatureBuffer = Buffer.from(signatureB64, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  let payload: IntakeTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8')) as IntakeTokenPayload;
  } catch {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  if (!payload.firm_id || !payload.intake_id || typeof payload.exp !== 'number') {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  if (payload.v !== TOKEN_VERSION) {
    return { ok: false, status: 401, error: 'Invalid intake token' };
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return { ok: false, status: 403, error: 'Intake token expired' };
  }

  return { ok: true, payload };
}
