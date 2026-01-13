const WILDCARD = Symbol('wildcard');

type PathSegment = string | number | typeof WILDCARD;

function parsePath(path: string): PathSegment[] {
  if (!path.startsWith('$')) return [];
  let remainder = path.slice(1);
  if (remainder.startsWith('.')) remainder = remainder.slice(1);
  const segments: PathSegment[] = [];
  const regex = /([^.\[\]]+)|\[(\d*)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(remainder)) !== null) {
    if (match[1]) {
      segments.push(match[1]);
    } else if (match[2] !== undefined) {
      if (match[2] === '') {
        segments.push(WILDCARD);
      } else {
        segments.push(Number(match[2]));
      }
    }
  }
  return segments;
}

export function getFieldValues(payload: unknown, path: string): unknown[] {
  const segments = parsePath(path);
  let values: unknown[] = [payload];
  for (const segment of segments) {
    const next: unknown[] = [];
    for (const value of values) {
      if (value === null || value === undefined) {
        continue;
      }
      if (segment === WILDCARD) {
        if (Array.isArray(value)) {
          next.push(...value);
        }
        continue;
      }
      if (typeof segment === 'number') {
        if (Array.isArray(value)) {
          next.push(value[segment]);
        }
        continue;
      }
      if (typeof value !== 'object') {
        continue;
      }
      next.push((value as Record<string, unknown>)[segment]);
    }
    values = next;
    if (values.length === 0) break;
  }
  return values;
}

export function getField(payload: unknown, path: string): unknown {
  const values = getFieldValues(payload, path);
  return values.length > 0 ? values[0] : undefined;
}
