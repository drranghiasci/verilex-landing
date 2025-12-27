alter table public.cases
  add column if not exists internal_notes text null;

alter table public.cases
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'cases_set_updated_at'
  ) then
    create trigger cases_set_updated_at
    before update on public.cases
    for each row
    execute function public.set_updated_at();
  end if;
end $$;
