import { supabaseAdmin } from './supabaseAdmin';

if (typeof window !== 'undefined') {
  throw new Error('storage helpers are server-only');
}

const DEFAULT_EXPIRES_IN = 60 * 60 * 2;

export async function createSignedUploadUrl(params: {
  bucket: string;
  path: string;
}) {
  const { bucket, path } = params;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data) {
    throw new Error('Unable to create upload URL');
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path,
    expiresIn: DEFAULT_EXPIRES_IN,
  };
}
