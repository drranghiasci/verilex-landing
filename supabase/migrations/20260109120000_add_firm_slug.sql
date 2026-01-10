-- Add a firm slug for /intake/{firm_slug} resolution.
-- Minimal + safe: column is nullable initially to avoid breaking existing rows.
-- Enforces uniqueness (case-insensitive) when slug is present.

alter table public.firms
  add column if not exists slug text;

-- Basic format validation (optional but recommended)
-- Allows lowercase letters, numbers, and hyphens, 3-63 chars, cannot start/end with hyphen
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'firms_slug_format_check'
  ) then
    alter table public.firms
      add constraint firms_slug_format_check
      check (
        slug is null OR
        slug ~ '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$'
      );
  end if;
end $$;

-- Enforce uniqueness, case-insensitive.
-- Partial index allows existing firms with NULL slug.
create unique index if not exists uniq_firms_slug_ci
  on public.firms (lower(slug))
  where slug is not null;

-- Helpful lookup index (also supports resolve-firm query)
create index if not exists idx_firms_slug
  on public.firms (slug);
