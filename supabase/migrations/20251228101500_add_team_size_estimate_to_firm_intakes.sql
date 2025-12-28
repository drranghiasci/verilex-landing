alter table public.firm_intakes
  add column if not exists team_size_estimate text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'firm_intakes_team_size_estimate_check'
  ) then
    alter table public.firm_intakes
      add constraint firm_intakes_team_size_estimate_check
      check (
        team_size_estimate is null
        or team_size_estimate in ('1','2-5','6-15','16-50','50+')
      );
  end if;
end $$;
