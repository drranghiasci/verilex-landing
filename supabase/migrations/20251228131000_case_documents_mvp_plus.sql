alter table public.case_documents
  add column if not exists display_name text null,
  add column if not exists doc_type text not null default 'other',
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists deleted_at timestamptz null;

create index if not exists idx_case_documents_firm_deleted on public.case_documents(firm_id, deleted_at);
create index if not exists idx_case_documents_case_deleted on public.case_documents(case_id, deleted_at);
