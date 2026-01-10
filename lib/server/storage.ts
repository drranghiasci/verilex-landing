import { supabaseAdmin } from './supabaseAdmin';

if (typeof window !== 'undefined') {
  throw new Error('storage helpers are server-only');
}

const DEFAULT_EXPIRES_IN = 60 * 5;

export async function createSignedUploadUrl(params: {
  bucket: string;
  path: string;
  expiresIn?: number;
  contentType?: string;
}) {
  const { bucket, path, expiresIn, contentType } = params;
  const options = contentType ? { contentType } : undefined;
  const expires = expiresIn ?? DEFAULT_EXPIRES_IN;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, expires, options);

  if (error || !data) {
    throw new Error('Unable to create upload URL');
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    expiresIn: expires,
  };
}
