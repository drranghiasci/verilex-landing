alter table public.cases
  add column if not exists title text null,
  add column if not exists client_first_name text null,
  add column if not exists client_last_name text null,
  add column if not exists client_email text null,
  add column if not exists client_phone text null,
  add column if not exists state text null,
  add column if not exists county text null,
  add column if not exists court_name text null,
  add column if not exists case_number text null;

alter table public.cases
  add column if not exists internal_notes text null;

alter table public.cases
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.cases
  add column if not exists matter_type text not null default 'Divorce';

alter table public.cases
  add column if not exists status text not null default 'open';
