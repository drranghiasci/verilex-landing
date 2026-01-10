import type { CountyRow } from './gaCounties';

export type CountyOption = {
  value: string;
  label: string;
  slug?: string;
  fips?: string;
  name?: string;
};

// Canonical storage: prefer county_slug when present, otherwise store county_name as-is.
export function getCanonicalCountyValue(county: CountyRow): string {
  const slug = county.slug?.trim();
  if (slug) return slug;
  return county.name.trim();
}

export function getCountyDisplayLabel(county: CountyRow): string {
  const display = county.display?.trim();
  if (display) return display;
  const name = county.name?.trim();
  if (name) return name;
  return county.slug?.trim() ?? '';
}

export function buildCountyOptions(counties: CountyRow[]): CountyOption[] {
  return counties.map((county) => ({
    value: getCanonicalCountyValue(county),
    label: getCountyDisplayLabel(county),
    slug: county.slug,
    fips: county.fips,
    name: county.name,
  }));
}

export function sortCountyOptions(options: CountyOption[]): CountyOption[] {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}
