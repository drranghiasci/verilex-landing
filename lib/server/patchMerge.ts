if (typeof window !== 'undefined') {
  throw new Error('patchMerge is server-only');
}

export type PatchMergeResult = {
  merged: Record<string, unknown>;
  unknownKeys: string[];
};

export function mergePatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
  allowedKeys: Set<string>,
): PatchMergeResult {
  const unknownKeys: string[] = [];
  const merged: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(patch)) {
    if (!allowedKeys.has(key)) {
      unknownKeys.push(key);
      continue;
    }
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return { merged, unknownKeys };
}
