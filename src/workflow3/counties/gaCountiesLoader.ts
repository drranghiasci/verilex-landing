import fs from 'fs';
import path from 'path';
import type { GaCountyLookup, GaCountyRow } from './types';

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, 'docs'))) {
    return cwd;
  }
  const candidate = path.resolve(cwd, '..', '..');
  if (fs.existsSync(path.join(candidate, 'docs'))) {
    return candidate;
  }
  return cwd;
}

const DEFAULT_GA_COUNTIES_PATH = path.join(resolveRepoRoot(), 'docs', 'ga_counties.csv');

let cachedLookup: GaCountyLookup | null = null;
let cachedPath: string | null = null;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        const next = line[i + 1];
        if (next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildLookup(rows: GaCountyRow[]): GaCountyLookup {
  const bySlug = new Map<string, GaCountyRow>();
  const byNameExact = new Map<string, GaCountyRow>();
  const byNameNormalized = new Map<string, GaCountyRow>();

  rows.forEach((row) => {
    if (row.slug) {
      bySlug.set(row.slug.toLowerCase(), row);
    }
    if (row.name) {
      byNameExact.set(row.name.toLowerCase(), row);
      byNameNormalized.set(normalizeWhitespace(row.name).toLowerCase(), row);
    }
  });

  return { rows, bySlug, byNameExact, byNameNormalized };
}

export function parseGaCountiesCsv(csvText: string): GaCountyLookup {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return buildLookup([]);
  }

  const headerCells = parseCsvLine(lines[0] ?? '');
  const headers = headerCells.map((header) => header.trim());
  const headerIndex = new Map<string, number>();
  headers.forEach((header, idx) => {
    headerIndex.set(normalizeHeader(header), idx);
  });

  const getIndex = (options: string[]) => {
    for (const option of options) {
      const idx = headerIndex.get(option);
      if (typeof idx === 'number') return idx;
    }
    return null;
  };

  const stateIdx = getIndex(['state', 'state_code', 'state_abbrev']);
  const nameIdx = getIndex(['county_name', 'name']);
  const displayIdx = getIndex(['county_display', 'display', 'county_display_name']);
  const slugIdx = getIndex(['county_slug', 'slug']);
  const fipsIdx = getIndex(['county_fips', 'fips', 'county_fips_code']);

  const rows: GaCountyRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i] ?? '');
    if (cells.length === 0) continue;

    const stateValue =
      stateIdx !== null && cells[stateIdx] ? normalizeWhitespace(cells[stateIdx]) : null;
    if (stateValue && stateValue.toUpperCase() !== 'GA') {
      continue;
    }

    const name = nameIdx !== null ? normalizeWhitespace(cells[nameIdx] ?? '') : '';
    if (!name) continue;

    const displayName = displayIdx !== null ? normalizeWhitespace(cells[displayIdx] ?? '') : '';
    const slug = slugIdx !== null ? normalizeWhitespace(cells[slugIdx] ?? '') : '';
    const fips = fipsIdx !== null ? normalizeWhitespace(cells[fipsIdx] ?? '') : '';

    const raw: Record<string, string> = {};
    headers.forEach((header, idx) => {
      raw[header] = cells[idx] ?? '';
    });

    rows.push({
      name,
      displayName: displayName || undefined,
      slug: slug || undefined,
      fips: fips || undefined,
      raw,
    });
  }

  return buildLookup(rows);
}

export function loadGaCounties(csvPath = DEFAULT_GA_COUNTIES_PATH): GaCountyLookup {
  const resolvedPath = path.resolve(csvPath);
  if (cachedLookup && cachedPath === resolvedPath) return cachedLookup;
  const csvText = fs.readFileSync(resolvedPath, 'utf8');
  cachedLookup = parseGaCountiesCsv(csvText);
  cachedPath = resolvedPath;
  return cachedLookup;
}
