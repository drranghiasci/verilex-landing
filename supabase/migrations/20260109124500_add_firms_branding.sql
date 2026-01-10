alter table public.firms
  add column if not exists branding jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'firms_branding_accent_color_format'
      and conrelid = 'public.firms'::regclass
  ) then
    alter table public.firms
      add constraint firms_branding_accent_color_format
      check (
        (branding ? 'accent_color') is false
        or jsonb_typeof(branding->'accent_color') = 'null'
        or (
          jsonb_typeof(branding->'accent_color') = 'string'
          and (branding->>'accent_color') ~ '^#[0-9A-Fa-f]{6}$'
        )
      );
  end if;
end $$;
