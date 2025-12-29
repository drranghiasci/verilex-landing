alter table public.profiles
  add column if not exists full_name text;
create index if not exists idx_profiles_full_name on public.profiles (full_name);
