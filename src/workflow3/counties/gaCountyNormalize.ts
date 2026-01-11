import type { CountyNormalizeResult, GaCountyLookup } from './types';

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeInput(value: string) {
  return normalizeWhitespace(value).toLowerCase();
}

function getCanonicalValue(row: { slug?: string; name: string }) {
  if (row.slug && row.slug.trim().length > 0) {
    return row.slug;
  }
  return row.name;
}

export function normalizeCounty(
  rawValue: string | null | undefined,
  lookup: GaCountyLookup,
): CountyNormalizeResult {
  if (!rawValue || typeof rawValue !== 'string') {
    return { ok: false, error: 'Missing county value' };
  }

  const trimmed = rawValue.trim();
  if (!trimmed) {
    return { ok: false, error: 'Missing county value' };
  }

  const slugKey = trimmed.toLowerCase();

  const slugMatch = lookup.bySlug.get(slugKey);
  if (slugMatch) {
    return {
      ok: true,
      normalized_value: getCanonicalValue(slugMatch),
      match_strategy: 'slug_exact',
      canonical_row: slugMatch,
    };
  }

  const nameExactKey = trimmed.toLowerCase();
  const nameExactMatch = lookup.byNameExact.get(nameExactKey);
  if (nameExactMatch) {
    return {
      ok: true,
      normalized_value: getCanonicalValue(nameExactMatch),
      match_strategy: 'name_exact',
      canonical_row: nameExactMatch,
    };
  }

  const normalizedKey = normalizeInput(rawValue);
  const trimmedMatch = lookup.byNameNormalized.get(normalizedKey);
  if (trimmedMatch) {
    return {
      ok: true,
      normalized_value: getCanonicalValue(trimmedMatch),
      match_strategy: 'name_trimmed',
      canonical_row: trimmedMatch,
    };
  }

  return { ok: false, error: 'Unknown county' };
}
