-- Ensure the profiles table accepts minimal data required by the auth trigger.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'email') then
    execute 'alter table public.profiles alter column email drop not null';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
    execute 'alter table public.profiles alter column created_at set default now()';
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
    execute 'alter table public.profiles alter column updated_at set default now()';
  end if;
end;
$$;

-- Minimal profile insert trigger for new auth users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists handle_new_user on auth.users;
create trigger handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();
