-- Security hardening for firm-scoped access

-- Helper functions (SECURITY DEFINER)
-- Drop existing helper functions to avoid parameter-name conflicts (42P13)
drop function if exists public.is_firm_member(uuid) cascade;
drop function if exists public.is_firm_admin(uuid) cascade;

create or replace function public.is_firm_member(check_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.firm_members
    where firm_id = check_firm_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_firm_admin(check_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.firm_members
    where firm_id = check_firm_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_firm_member(uuid) to authenticated;
grant execute on function public.is_firm_admin(uuid) to authenticated;

-- firm_members RLS
alter table public.firm_members enable row level security;

drop policy if exists firm_members_select_self on public.firm_members;
create policy firm_members_select_self
on public.firm_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists firm_members_select_admin on public.firm_members;
create policy firm_members_select_admin
on public.firm_members
for select
to authenticated
using (public.is_firm_admin(firm_id));

revoke insert, update, delete on public.firm_members from anon, authenticated;
grant select on public.firm_members to authenticated;

-- cases RLS
alter table public.cases enable row level security;

create index if not exists idx_cases_firm_id on public.cases(firm_id);

drop policy if exists cases_select_firm_scoped on public.cases;
create policy cases_select_firm_scoped
on public.cases
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists cases_insert_firm_scoped on public.cases;
create policy cases_insert_firm_scoped
on public.cases
for insert
to authenticated
with check (public.is_firm_member(firm_id));

drop policy if exists cases_update_firm_scoped on public.cases;
create policy cases_update_firm_scoped
on public.cases
for update
to authenticated
using (public.is_firm_member(firm_id))
with check (public.is_firm_member(firm_id));

-- case_documents firm_id backfill + RLS
alter table public.case_documents
  add column if not exists firm_id uuid;

update public.case_documents d
set firm_id = c.firm_id
from public.cases c
where d.firm_id is null
  and d.case_id = c.id;

alter table public.case_documents
  alter column firm_id set not null;

create index if not exists idx_case_documents_firm_id on public.case_documents(firm_id);
create index if not exists idx_case_documents_case_id on public.case_documents(case_id);

alter table public.case_documents enable row level security;

drop policy if exists case_documents_select_firm_scoped on public.case_documents;
create policy case_documents_select_firm_scoped
on public.case_documents
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists case_documents_insert_firm_scoped on public.case_documents;
create policy case_documents_insert_firm_scoped
on public.case_documents
for insert
to authenticated
with check (public.is_firm_member(firm_id));

drop policy if exists case_documents_update_firm_scoped on public.case_documents;
create policy case_documents_update_firm_scoped
on public.case_documents
for update
to authenticated
using (public.is_firm_member(firm_id))
with check (public.is_firm_member(firm_id));

-- Storage: restrict SELECT to firm members for case-documents bucket
drop policy if exists case_documents_storage_select on storage.objects;
create policy case_documents_storage_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'case-documents'
  and exists (
    select 1
    from public.case_documents d
    where d.storage_path = storage.objects.name
      and public.is_firm_member(d.firm_id)
  )
);
