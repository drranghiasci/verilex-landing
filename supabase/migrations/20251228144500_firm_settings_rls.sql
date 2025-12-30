alter table public.firms enable row level security;

drop policy if exists firms_select_firm_scoped on public.firms;
create policy firms_select_firm_scoped
on public.firms
for select
to authenticated
using (public.is_firm_member(id));

drop policy if exists firms_update_admin_only on public.firms;
create policy firms_update_admin_only
on public.firms
for update
to authenticated
using (public.is_firm_admin(id))
with check (public.is_firm_admin(id));
