import fs from 'fs';
import path from 'path';

export type CountyRow = {
  name: string;
  display: string;
  slug?: string;
  fips?: string;
};

const HEADER_CANDIDATES = {
  name: ['county_name', 'name'],
  display: ['county_display', 'display'],
  slug: ['county_slug', 'slug'],
  fips: ['county_fips', 'fips'],
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase();
}

function findHeaderIndex(headers: string[], candidates: string[]): number | null {
  for (const candidate of candidates) {
    const index = headers.indexOf(candidate);
    if (index >= 0) return index;
  }
  return null;
}

function resolveGaCountiesPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'docs', 'ga_counties.csv'),
    path.resolve(process.cwd(), '..', 'docs', 'ga_counties.csv'),
    path.resolve(process.cwd(), '..', '..', 'docs', 'ga_counties.csv'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error('Unable to locate docs/ga_counties.csv');
}

function cleanValue(value: string | undefined): string {
  return (value ?? '').trim();
}

export function loadGaCounties(csvPath?: string): CountyRow[] {
  const filePath = csvPath ?? resolveGaCountiesPath();
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const nameIndex = findHeaderIndex(headers, HEADER_CANDIDATES.name);
  const displayIndex = findHeaderIndex(headers, HEADER_CANDIDATES.display);
  const slugIndex = findHeaderIndex(headers, HEADER_CANDIDATES.slug);
  const fipsIndex = findHeaderIndex(headers, HEADER_CANDIDATES.fips);

  if (nameIndex === null && displayIndex === null && slugIndex === null) {
    throw new Error('ga_counties.csv is missing a county name/slug column');
  }

  const rows: CountyRow[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const columns = parseCsvLine(lines[rowIndex]);
    const name = cleanValue(columns[nameIndex ?? -1])
      || cleanValue(columns[displayIndex ?? -1])
      || cleanValue(columns[slugIndex ?? -1]);
    const display = cleanValue(columns[displayIndex ?? -1]) || name;
    const slug = cleanValue(columns[slugIndex ?? -1]);
    const fips = cleanValue(columns[fipsIndex ?? -1]);

    if (!name && !display && !slug) continue;

    const row: CountyRow = {
      name: name || display || slug,
      display: display || name || slug,
    };

    if (slug) row.slug = slug;
    if (fips) row.fips = fips;

    rows.push(row);
  }

  return rows;
}
