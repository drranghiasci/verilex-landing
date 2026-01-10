type PathSegment = string | number;

function toSegments(path: string): PathSegment[] {
  const segments: PathSegment[] = [];
  const parts = path.split('.').filter(Boolean);

  for (const part of parts) {
    const match = part.match(/^([a-zA-Z0-9_]+)(?:\[(\d+)])?$/);
    if (!match) {
      segments.push(part);
      continue;
    }
    const [, key, index] = match;
    segments.push(key);
    if (index !== undefined) {
      segments.push(Number(index));
    }
  }

  return segments;
}

export function getPathValue(target: Record<string, unknown>, path: string): unknown {
  const segments = toSegments(path);
  let current: unknown = target;

  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof segment === 'number') {
      if (!Array.isArray(current)) return undefined;
      current = current[segment];
    } else if (typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

export function setPathValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = toSegments(path);
  if (segments.length === 0) return target;

  const result: Record<string, unknown> = { ...target };
  let cursor: Record<string, unknown> | unknown[] = result;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;

    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) {
        cursor = [];
      }
      const arrayCursor = cursor as unknown[];
      if (isLast) {
        arrayCursor[segment] = value;
        return;
      }
      const next = arrayCursor[segment];
      const nextContainer = Array.isArray(next) || typeof next === 'object' ? next : {};
      arrayCursor[segment] = nextContainer;
      cursor = nextContainer as Record<string, unknown>;
      return;
    }

    if (typeof cursor !== 'object' || cursor === null || Array.isArray(cursor)) {
      cursor = {};
    }
    const objectCursor = cursor as Record<string, unknown>;
    if (isLast) {
      objectCursor[segment] = value;
      return;
    }
    const next = objectCursor[segment];
    const nextContainer = Array.isArray(next) || typeof next === 'object' ? next : {};
    objectCursor[segment] = nextContainer;
    cursor = nextContainer as Record<string, unknown>;
  });

  return result;
}
