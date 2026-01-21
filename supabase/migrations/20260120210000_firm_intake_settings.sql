-- Firm Intake Settings Table
-- Stores firm-specific customization for client-facing intake pages

-- Create table
create table if not exists public.firm_intake_settings (
  firm_id uuid primary key references public.firms(id) on delete cascade,
  
  -- Branding
  firm_logo_url text,
  brand_accent_preset text not null default 'verilex_default'
    constraint brand_accent_preset_valid check (
      brand_accent_preset in ('verilex_default', 'slate', 'indigo', 'emerald', 'amber', 'rose')
    ),
  brand_theme_default text not null default 'system'
    constraint brand_theme_default_valid check (
      brand_theme_default in ('system', 'light', 'dark')
    ),
  
  -- Intake configuration
  enabled_intakes text[] not null default '{custody_unmarried,divorce_no_children,divorce_with_children}',
  default_intake_type text,
  show_not_sure_option boolean not null default true,
  
  -- Content blocks
  welcome_message text,
  what_to_expect_bullets text[],
  
  -- Timestamps
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Validation constraints
alter table public.firm_intake_settings
  add constraint welcome_message_length check (
    welcome_message is null or char_length(welcome_message) <= 240
  );

alter table public.firm_intake_settings
  add constraint what_to_expect_bullets_max_count check (
    what_to_expect_bullets is null or array_length(what_to_expect_bullets, 1) <= 3
  );

-- Default intake type must be in enabled_intakes if set
alter table public.firm_intake_settings
  add constraint default_intake_must_be_enabled check (
    default_intake_type is null or default_intake_type = any(enabled_intakes)
  );

-- Enable RLS
alter table public.firm_intake_settings enable row level security;

-- Policy 1: Firm members can SELECT their own firm settings
create policy "Firm members can view settings"
  on public.firm_intake_settings
  for select
  using (
    exists (
      select 1 from public.firm_members fm
      where fm.firm_id = firm_intake_settings.firm_id
        and fm.user_id = auth.uid()
    )
  );

-- Policy 2: Firm admins can INSERT their own firm settings
create policy "Firm admins can insert settings"
  on public.firm_intake_settings
  for insert
  with check (
    exists (
      select 1 from public.firm_members fm
      where fm.firm_id = firm_intake_settings.firm_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );

-- Policy 3: Firm admins can UPDATE their own firm settings
create policy "Firm admins can update settings"
  on public.firm_intake_settings
  for update
  using (
    exists (
      select 1 from public.firm_members fm
      where fm.firm_id = firm_intake_settings.firm_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.firm_members fm
      where fm.firm_id = firm_intake_settings.firm_id
        and fm.user_id = auth.uid()
        and fm.role = 'admin'
    )
  );

-- Create updated_at trigger
create or replace function public.firm_intake_settings_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger firm_intake_settings_updated_at_trigger
  before update on public.firm_intake_settings
  for each row
  execute function public.firm_intake_settings_updated_at();

-- Create secure RPC for public intake access (returns safe fields only)
create or replace function public.get_firm_intake_config(p_firm_slug text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_firm_id uuid;
  v_firm_name text;
  v_firm_website text;
  v_settings record;
begin
  -- Get firm by slug
  select id, name, website_url
  into v_firm_id, v_firm_name, v_firm_website
  from public.firms
  where slug = p_firm_slug
  limit 1;
  
  if v_firm_id is null then
    return null;
  end if;
  
  -- Get settings or use defaults
  select * into v_settings
  from public.firm_intake_settings
  where firm_id = v_firm_id;
  
  -- Return safe subset
  return json_build_object(
    'firm', json_build_object(
      'id', v_firm_id,
      'name', v_firm_name,
      'website_url', v_firm_website
    ),
    'intake_settings', json_build_object(
      'firm_logo_url', coalesce(v_settings.firm_logo_url, null),
      'brand_accent_preset', coalesce(v_settings.brand_accent_preset, 'verilex_default'),
      'brand_theme_default', coalesce(v_settings.brand_theme_default, 'system'),
      'enabled_intakes', coalesce(v_settings.enabled_intakes, array['custody_unmarried', 'divorce_no_children', 'divorce_with_children']),
      'default_intake_type', v_settings.default_intake_type,
      'show_not_sure_option', coalesce(v_settings.show_not_sure_option, true),
      'welcome_message', v_settings.welcome_message,
      'what_to_expect_bullets', v_settings.what_to_expect_bullets
    )
  );
end;
$$;

-- Grant execute to anon for public intake access
grant execute on function public.get_firm_intake_config(text) to anon;
grant execute on function public.get_firm_intake_config(text) to authenticated;
