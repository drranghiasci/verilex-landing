alter table public.firms
  add column if not exists plan text not null default 'free';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'firms_plan_check'
  ) then
    alter table public.firms
      add constraint firms_plan_check
      check (plan in ('free', 'pro', 'enterprise'));
  end if;
end $$;
