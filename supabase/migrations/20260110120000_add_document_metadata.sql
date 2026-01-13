alter table public.intake_documents
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists uploaded_by_role text not null default 'client';

alter table public.case_documents
  add column if not exists uploaded_by_role text not null default 'firm';
