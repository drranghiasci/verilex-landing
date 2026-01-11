export type GaCountyRow = {
  name: string;
  displayName?: string;
  slug?: string;
  fips?: string;
  raw: Record<string, string>;
};

export type GaCountyLookup = {
  rows: GaCountyRow[];
  bySlug: Map<string, GaCountyRow>;
  byNameExact: Map<string, GaCountyRow>;
  byNameNormalized: Map<string, GaCountyRow>;
};

export type CountyMatchStrategy = 'slug_exact' | 'name_exact' | 'name_trimmed';

export type CountyNormalizeResult =
  | {
      ok: true;
      normalized_value: string;
      match_strategy: CountyMatchStrategy;
      canonical_row: GaCountyRow;
    }
  | {
      ok: false;
      error: string;
    };
