type PathSegment = string | number;

function parsePath(path: string): PathSegment[] {
  if (!path.startsWith('$')) return [];
  let remainder = path.slice(1);
  if (remainder.startsWith('.')) remainder = remainder.slice(1);
  const segments: PathSegment[] = [];
  const regex = /([^.\[\]]+)|\[(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(remainder)) !== null) {
    if (match[1]) {
      segments.push(match[1]);
    } else if (match[2]) {
      segments.push(Number(match[2]));
    }
  }
  return segments;
}

export function getField(payload: unknown, path: string): unknown {
  const segments = parsePath(path);
  let current: unknown = payload;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
      continue;
    }
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
