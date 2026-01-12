import { loadGaCounties } from '../../workflow3/counties/gaCountiesLoader';

type CountyLookup = {
  canonicalList: string[];
  byName: Map<string, string>;
  bySlug: Map<string, string>;
};

function normalizeCountyInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\bcounty\b/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function loadWf4Counties(): CountyLookup {
  const { rows } = loadGaCounties();
  const canonicalList: string[] = [];
  const byName = new Map<string, string>();
  const bySlug = new Map<string, string>();

  rows.forEach((row) => {
    const canonical = row.slug ?? row.name;
    canonicalList.push(canonical);

    const nameKey = normalizeCountyInput(row.name);
    if (nameKey) {
      byName.set(nameKey, canonical);
    }

    if (row.slug) {
      const slugKey = normalizeCountyInput(row.slug);
      if (slugKey) {
        bySlug.set(slugKey, canonical);
      }
    }
  });

  return { canonicalList, byName, bySlug };
}

export function matchCountyMention(
  rawValue: string | null | undefined,
  lookup: CountyLookup,
): { suggested_county: string | null; match_type: 'EXACT' | 'FUZZY' | 'NONE' } {
  if (!rawValue || typeof rawValue !== 'string') {
    return { suggested_county: null, match_type: 'NONE' };
  }

  const normalized = normalizeCountyInput(rawValue);
  if (!normalized) {
    return { suggested_county: null, match_type: 'NONE' };
  }

  const exactName = lookup.byName.get(normalized);
  if (exactName) {
    return { suggested_county: exactName, match_type: 'EXACT' };
  }

  const exactSlug = lookup.bySlug.get(normalized);
  if (exactSlug) {
    return { suggested_county: exactSlug, match_type: 'EXACT' };
  }

  const candidates = new Set<string>();
  for (const [key, value] of lookup.byName.entries()) {
    if (key.startsWith(normalized)) {
      candidates.add(value);
    }
  }
  for (const [key, value] of lookup.bySlug.entries()) {
    if (key.startsWith(normalized)) {
      candidates.add(value);
    }
  }

  if (candidates.size === 1) {
    return { suggested_county: Array.from(candidates)[0], match_type: 'FUZZY' };
  }

  return { suggested_county: null, match_type: 'NONE' };
}

export function isCanonicalCounty(value: string, lookup: CountyLookup) {
  return lookup.canonicalList.includes(value);
}
