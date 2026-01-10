-- Adds firms.slug for /intake/{firm_slug} resolution and backfills it safely.
-- Auto-slugs new firms when slug is NULL.
-- Collision-safe: appends "-2", "-3", etc.
-- Idempotent: safe to re-run.

-- 1) Add column
alter table public.firms
  add column if not exists slug text;

-- 2) Optional: format check (lowercase letters/numbers/hyphens, 3–63 chars, no leading/trailing hyphen)
do $$
begin
  if not exists (
    select 1 from pg_constraint
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

-- 3) Case-insensitive uniqueness for non-null slugs
create unique index if not exists uniq_firms_slug_ci
  on public.firms (lower(slug))
  where slug is not null;

create index if not exists idx_firms_slug
  on public.firms (slug);

-- 4) Slugify helper (stable)
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(input,'')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;

-- 5) Collision-safe allocator
create or replace function public.allocate_firm_slug(desired text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := public.slugify(desired);
  candidate text := base;
  i int := 2;
begin
  if base is null or base = '' then
    base := 'firm';
    candidate := base;
  end if;

  -- If base is too short, pad
  if length(base) < 3 then
    base := base || '-law';
    candidate := base;
  end if;

  -- Enforce max length (leave room for suffix)
  if length(candidate) > 63 then
    candidate := left(candidate, 63);
    candidate := trim(both '-' from candidate);
  end if;

  -- Find a unique slug (case-insensitive)
  while exists (
    select 1 from public.firms f
    where f.slug is not null and lower(f.slug) = lower(candidate)
  ) loop
    candidate := base || '-' || i::text;
    i := i + 1;

    -- Keep within 63 chars
    if length(candidate) > 63 then
      candidate := left(base, 63 - length('-' || (i-1)::text)) || '-' || (i-1)::text;
      candidate := trim(both '-' from candidate);
    end if;
  end loop;

  return candidate;
end $$;

-- 6) Trigger to auto-set slug on insert/update when slug is NULL
create or replace function public.set_firm_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := public.allocate_firm_slug(new.name);
  else
    -- normalize provided slug
    new.slug := public.slugify(new.slug);
  end if;

  return new;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_firms_set_slug'
  ) then
    create trigger trg_firms_set_slug
      before insert or update of name, slug
      on public.firms
      for each row
      execute function public.set_firm_slug();
  end if;
end $$;

-- 7) Backfill existing rows (only where slug is NULL/empty)
update public.firms
set slug = public.allocate_firm_slug(name)
where slug is null or slug = '';
