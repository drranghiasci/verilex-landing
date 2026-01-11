import fs from 'fs';
import path from 'path';
import type { LoadedRuleCatalog, RuleCatalog } from './types';
import { assertValidCatalog } from './validateRuleCatalog';

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

export const DEFAULT_RULE_CATALOG_PATH = path.join(
  resolveRepoRoot(),
  'docs',
  'workflow 3',
  'workflow-03-rule-catalog.json',
);

let cachedCatalog: RuleCatalog | null = null;
let cachedPath: string | null = null;

export function loadRuleCatalog(catalogPath = DEFAULT_RULE_CATALOG_PATH): RuleCatalog {
  const resolvedPath = path.resolve(catalogPath);
  if (cachedCatalog && cachedPath === resolvedPath) {
    return cachedCatalog;
  }
  const rawText = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(rawText) as unknown;
  const validated = assertValidCatalog(parsed);
  cachedCatalog = validated.catalog;
  cachedPath = resolvedPath;
  return cachedCatalog;
}

export function getRuleCatalog(catalogPath = DEFAULT_RULE_CATALOG_PATH): LoadedRuleCatalog {
  const catalog = loadRuleCatalog(catalogPath);
  return { catalog, ruleset_version: catalog.ruleset_version };
}
