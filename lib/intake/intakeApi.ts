export type ResolveFirmResponse = {
  firm_id: string;
  firm_name: string;
  branding?: {
    logo_url?: string;
    accent_color?: string;
  };
};

export type StartIntakeResponse = {
  token: string;
  resumePath: string;
};

export type IntakeRecord = {
  id: string;
  status: 'draft' | 'submitted';
  submitted_at: string | null;
  raw_payload: Record<string, unknown>;
  matter_type?: string | null;
  urgency_level?: string | null;
  intake_channel?: string | null;
  language_preference?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type IntakeMessage = {
  seq?: number;
  source: string;
  channel: string;
  content: string;
  content_structured?: Record<string, unknown>;
  created_at?: string;
};

export type IntakeDocument = {
  storage_object_path: string;
  document_type?: string | null;
  classification?: Record<string, unknown>;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_by_role?: string | null;
  created_at?: string;
};

export type LoadIntakeResponse = {
  intake: IntakeRecord;
  messages: IntakeMessage[];
  documents: IntakeDocument[];
  locked: boolean;
};

export type SaveResult =
  | { ok: true; updated_at?: string | null; last_seq?: number | null }
  | { ok: false; locked: true };

export type SubmitResult =
  | { ok: true; submitted_at: string | null; locked: true }
  | { ok: false; locked: true };

export type MessageInput = {
  source: string;
  channel: string;
  content: string;
  content_structured?: Record<string, unknown>;
};

export type DocumentInput = {
  storage_object_path: string;
  document_type?: string;
  classification?: Record<string, unknown>;
  content_type?: string;
  size_bytes?: number;
};

export type CreateUploadResult = {
  storage_object_path: string;
  signed_url: string;
  expires_in: number;
};

export type ConfirmUploadResult = IntakeDocument;

type ApiError = Error & { status?: number; requestId?: string; data?: unknown };

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const error = new Error((data.error as string) || 'Request failed') as ApiError;
    error.status = response.status;
    error.requestId = typeof data.requestId === 'string' ? data.requestId : undefined;
    error.data = data;
    throw error;
  }
  return data as T;
}

export async function resolveFirm(firmSlug: string): Promise<ResolveFirmResponse> {
  return requestJson<ResolveFirmResponse>('/api/intake/resolve-firm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ firm_slug: firmSlug }),
  });
}

export async function startIntake(params: {
  firmSlug: string;
  matter_type?: string;
  urgency_level?: string;
  intake_channel?: string;
  language_preference?: string;
}): Promise<StartIntakeResponse> {
  return requestJson<StartIntakeResponse>('/api/intake/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firm_slug: params.firmSlug,
      matter_type: params.matter_type,
      urgency_level: params.urgency_level,
      intake_channel: params.intake_channel,
      language_preference: params.language_preference,
    }),
  });
}

export async function loadIntake(params: {
  token: string;
  intakeId?: string;
}): Promise<LoadIntakeResponse> {
  if (params.intakeId) {
    return requestJson<LoadIntakeResponse>(`/api/intake/load?intakeId=${encodeURIComponent(params.intakeId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${params.token}`,
      },
    });
  }

  return requestJson<LoadIntakeResponse>('/api/intake/load', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

export async function saveIntake(params: {
  token: string;
  intakeId: string;
  patch?: Record<string, unknown>;
  messages?: MessageInput[];
  documents?: DocumentInput[];
}): Promise<SaveResult> {
  const response = await fetch('/api/intake/save', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intakeId: params.intakeId,
      patch: params.patch ?? {},
      messages: params.messages ?? [],
      documents: params.documents ?? [],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 409 && data.locked) {
    return { ok: false, locked: true };
  }
  if (!response.ok) {
    const error = new Error((data.error as string) || 'Unable to save intake') as ApiError;
    error.status = response.status;
    error.requestId = typeof data.requestId === 'string' ? data.requestId : undefined;
    error.data = data;
    throw error;
  }

  return {
    ok: true,
    updated_at: typeof data.updated_at === 'string' ? data.updated_at : null,
    last_seq: typeof data.last_seq === 'number' ? data.last_seq : null,
  };
}

export async function submitIntake(params: {
  token: string;
  intakeId: string;
  patch?: Record<string, unknown>;
}): Promise<SubmitResult> {
  const response = await fetch('/api/intake/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intakeId: params.intakeId,
      patch: params.patch ?? {},
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.status === 409 && data.locked) {
    return { ok: false, locked: true };
  }
  if (!response.ok) {
    const error = new Error((data.error as string) || 'Unable to submit intake') as ApiError;
    error.status = response.status;
    error.requestId = typeof data.requestId === 'string' ? data.requestId : undefined;
    error.data = data;
    throw error;
  }

  return {
    ok: true,
    locked: true,
    submitted_at: typeof data.submitted_at === 'string' ? data.submitted_at : null,
  };
}

export async function createUpload(params: {
  token: string;
  intakeId: string;
  filename: string;
  contentType?: string;
  size_bytes?: number;
}): Promise<CreateUploadResult> {
  return requestJson<CreateUploadResult>('/api/intake/documents/create-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intakeId: params.intakeId,
      filename: params.filename,
      content_type: params.contentType,
      size_bytes: params.size_bytes,
    }),
  });
}

export async function confirmUpload(params: {
  token: string;
  intakeId: string;
  storage_object_path: string;
  document_type?: string;
  classification?: Record<string, unknown>;
  content_type?: string;
  size_bytes?: number;
}): Promise<ConfirmUploadResult> {
  return requestJson<ConfirmUploadResult>('/api/intake/documents/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intakeId: params.intakeId,
      storage_object_path: params.storage_object_path,
      document_type: params.document_type,
      classification: params.classification,
      content_type: params.content_type,
      size_bytes: params.size_bytes,
    }),
  });
}
