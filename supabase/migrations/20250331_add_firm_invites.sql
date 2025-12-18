do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'firm_invites'
  ) then
    create table public.firm_invites (
      id uuid primary key default gen_random_uuid(),
      firm_id uuid not null references public.firms(id) on delete cascade,
      email text not null,
      role text not null default 'member',
      status text not null default 'pending',
      invited_at timestamptz not null default now(),
      accepted_at timestamptz,
      accepted_user_id uuid references auth.users(id)
    );
  end if;
end;
$$;

alter table public.firm_invites
  add column if not exists invited_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'firm_members'
      and column_name = 'role'
  ) then
    alter table public.firm_members
      add column role text not null default 'member';
  end if;
end;
$$;

alter table public.firm_members
  alter column role set default 'member';

alter table public.firm_members
  add column if not exists updated_at timestamptz default now();

alter table public.firm_members
  add column if not exists created_at timestamptz default now();

alter table public.firm_members
  add column if not exists is_active boolean default true;

alter table public.firm_members
  add constraint if not exists firm_members_firm_id_user_id_key unique (firm_id, user_id);
