import { getField } from './getField';

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  return false;
}

export function findMissingPaths(payload: unknown, paths: string[]): string[] {
  const missing: string[] = [];
  paths.forEach((path) => {
    const value = getField(payload, path);
    if (isMissingValue(value)) {
      missing.push(path);
    }
  });
  return missing;
}
