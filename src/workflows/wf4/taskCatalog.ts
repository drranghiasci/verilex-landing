import fs from 'fs';
import path from 'path';
import type { Wf4TaskCatalog } from './types';

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

function getTaskCatalogPath(): string {
  return path.join(
    resolveRepoRoot(),
    'docs',
    'workflow 4',
    'workflow-04-ai-task-catalog.json',
  );
}

let cachedCatalog: Wf4TaskCatalog | null = null;
let cachedPath: string | null = null;

export function loadWf4TaskCatalog(catalogPath?: string): Wf4TaskCatalog {
  const resolvedPath = path.resolve(catalogPath ?? getTaskCatalogPath());
  if (cachedCatalog && cachedPath === resolvedPath) {
    return cachedCatalog;
  }
  const raw = fs.readFileSync(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as Wf4TaskCatalog;
  cachedCatalog = parsed;
  cachedPath = resolvedPath;
  return cachedCatalog;
}
