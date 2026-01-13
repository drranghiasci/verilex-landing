export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'video/mp4',
  'video/quicktime',
  'text/plain',
];

export const DOCUMENT_TYPE_ALLOWLIST = [
  'pay_stub',
  'tax_return',
  'bank_statement',
  'financial_statement',
  'real_estate_document',
  'vehicle_title',
  'retirement_statement',
  'business_record',
  'text_message',
  'email',
  'photo',
  'video',
  'police_report',
  'court_order',
  'protective_order',
  'medical_record',
  'school_record',
  'other',
];

export const CASE_DOCUMENT_TYPE_ALLOWLIST = Array.from(
  new Set([...DOCUMENT_TYPE_ALLOWLIST, 'other']),
);

export function isAllowedMimeType(contentType?: string | null) {
  if (!contentType) return true;
  return ALLOWED_MIME_TYPES.includes(contentType);
}

export function isAllowedDocumentType(
  value?: string | null,
  allowlist: string[] = DOCUMENT_TYPE_ALLOWLIST,
) {
  if (!value) return true;
  return allowlist.includes(value);
}
