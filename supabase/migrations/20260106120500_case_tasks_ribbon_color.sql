alter table public.case_tasks
  add column if not exists ribbon_color text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'case_tasks_ribbon_color_check'
  ) then
    alter table public.case_tasks
      add constraint case_tasks_ribbon_color_check
      check (
        ribbon_color is null
        or ribbon_color in ('red','orange','yellow','green','blue','pink','purple')
      );
  end if;
end $$;
