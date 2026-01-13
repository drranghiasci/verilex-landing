import { getFieldValues } from './getField';

export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    return value.every((entry) => isMissingValue(entry));
  }
  return false;
}

export function findMissingPaths(payload: unknown, paths: string[]): string[] {
  const missing: string[] = [];
  paths.forEach((path) => {
    const values = getFieldValues(payload, path);
    if (values.length === 0 || values.some((value) => isMissingValue(value))) {
      missing.push(path);
    }
  });
  return missing;
}
