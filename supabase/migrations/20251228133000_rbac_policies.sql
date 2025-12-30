-- Role-based policies for firm access

drop function if exists public.is_firm_editor(uuid) cascade;

create or replace function public.is_firm_editor(check_firm_id uuid)
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
      and role in ('admin', 'attorney')
  );
$$;

grant execute on function public.is_firm_editor(uuid) to authenticated;

-- cases policies (writes require editor)
alter table public.cases enable row level security;

drop policy if exists cases_insert_firm_scoped on public.cases;
create policy cases_insert_firm_scoped
on public.cases
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists cases_update_firm_scoped on public.cases;
create policy cases_update_firm_scoped
on public.cases
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- case_documents policies (writes require editor)
alter table public.case_documents enable row level security;

drop policy if exists case_documents_insert_firm_scoped on public.case_documents;
create policy case_documents_insert_firm_scoped
on public.case_documents
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists case_documents_update_firm_scoped on public.case_documents;
create policy case_documents_update_firm_scoped
on public.case_documents
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));
