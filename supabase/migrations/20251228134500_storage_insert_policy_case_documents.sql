-- Storage insert policy for case-documents uploads (client-side)

insert into storage.buckets (id, name, public)
select 'case-documents', 'case-documents', false
where not exists (
  select 1 from storage.buckets where id = 'case-documents'
);

drop function if exists public.storage_firm_id_from_path(text);

create or replace function public.storage_firm_id_from_path(path text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when split_part(path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(path, '/', 1)::uuid
    else null
  end;
$$;

grant execute on function public.storage_firm_id_from_path(text) to authenticated;

drop policy if exists case_documents_storage_insert on storage.objects;
create policy case_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'case-documents'
  and public.storage_firm_id_from_path(name) is not null
  and public.is_firm_editor(public.storage_firm_id_from_path(name))
);
