import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import formidable, { type File as FormidableFile } from 'formidable';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

export const config = {
  api: {
    bodyParser: false,
  },
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = {
  ok: true;
  document: { id: string; filename: string; created_at: string };
};

type UploadFields = {
  caseId?: string | string[];
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

function getSingleField(value?: string | string[]) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] : value;
}

function getSingleFile(file?: FormidableFile | FormidableFile[]) {
  if (!file) return null;
  return Array.isArray(file) ? file[0] : file;
}

function sanitizeFilename(name: string) {
  const trimmed = name.replace(/[/\\]/g, '').trim();
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
  return safe.length > 0 ? safe : 'document';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | SuccessResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
  }

  const form = formidable({
    multiples: false,
    maxFileSize: MAX_FILE_SIZE,
  });

  let fields: UploadFields;
  let files: { file?: FormidableFile | FormidableFile[] };
  try {
    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, parsedFields, parsedFiles) => {
        if (err) {
          reject(err);
          return;
        }
        resolve([parsedFields as UploadFields, parsedFiles as { file?: FormidableFile | FormidableFile[] }]);
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to parse upload';
    if (message.toLowerCase().includes('maxfile')) {
      return res.status(413).json({ ok: false, error: 'File exceeds 15MB limit.' });
    }
    return res.status(400).json({ ok: false, error: message });
  }

  const caseId = getSingleField(fields.caseId);
  if (!caseId || !UUID_RE.test(caseId)) {
    return res.status(400).json({ ok: false, error: 'Invalid case id' });
  }

  const uploadedFile = getSingleFile(files.file);
  if (!uploadedFile) {
    return res.status(400).json({ ok: false, error: 'File is required' });
  }

  if (uploadedFile.size && uploadedFile.size > MAX_FILE_SIZE) {
    return res.status(413).json({ ok: false, error: 'File exceeds 15MB limit.' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ ok: false, error: 'Invalid session' });
  }

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id')
    .eq('user_id', authData.user.id)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }

  const { data: caseRows, error: caseError } = await adminClient
    .from('cases')
    .select('id, firm_id')
    .eq('id', caseId)
    .limit(1);

  if (caseError) {
    return res.status(500).json({ ok: false, error: caseError.message });
  }

  const caseRow = Array.isArray(caseRows) && caseRows.length > 0 ? caseRows[0] : null;
  if (!caseRow || caseRow.firm_id !== membership.firm_id) {
    return res.status(404).json({ ok: false, error: 'Case not found' });
  }

  const filename = sanitizeFilename(uploadedFile.originalFilename || 'document');
  const storagePath = `${membership.firm_id}/${caseId}/${randomUUID()}-${filename}`;

  const fileBuffer = await readFile(uploadedFile.filepath);
  const contentType = uploadedFile.mimetype || 'application/octet-stream';

  const { error: storageError } = await adminClient.storage
    .from('case-documents')
    .upload(storagePath, fileBuffer, { contentType, upsert: false });

  if (storageError) {
    return res.status(500).json({ ok: false, error: storageError.message });
  }

  const { data: insertedDoc, error: insertError } = await adminClient
    .from('case_documents')
    .insert({
      firm_id: membership.firm_id,
      case_id: caseId,
      storage_path: storagePath,
      filename: uploadedFile.originalFilename || filename,
      mime_type: uploadedFile.mimetype,
      size_bytes: uploadedFile.size ?? null,
      uploaded_by: authData.user.id,
    })
    .select('id, filename, created_at')
    .single();

  if (insertError || !insertedDoc) {
    return res.status(500).json({ ok: false, error: insertError?.message || 'Unable to save document' });
  }

  return res.status(200).json({ ok: true, document: insertedDoc });
}
