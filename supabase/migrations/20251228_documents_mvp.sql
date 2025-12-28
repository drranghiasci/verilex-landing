-- Case documents table + storage bucket (private)
create table if not exists public.case_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text null,
  size_bytes bigint null,
  uploaded_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_documents_case_id on public.case_documents(case_id);
create index if not exists idx_case_documents_firm_id on public.case_documents(firm_id);
create index if not exists idx_case_documents_created_at on public.case_documents(created_at desc);

alter table public.case_documents enable row level security;

drop policy if exists case_documents_select_firm_scoped on public.case_documents;

create policy case_documents_select_firm_scoped
on public.case_documents
for select
to authenticated
using (public.is_firm_member(case_documents.firm_id));

-- Create private storage bucket if missing
insert into storage.buckets (id, name, public)
select 'case-documents', 'case-documents', false
where not exists (
  select 1 from storage.buckets where id = 'case-documents'
);
