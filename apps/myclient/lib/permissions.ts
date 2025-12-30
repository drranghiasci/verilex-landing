export type FirmRole = 'admin' | 'attorney' | 'staff';

export function isFirmRole(value: unknown): value is FirmRole {
  return value === 'admin' || value === 'attorney' || value === 'staff';
}

function normalizeRole(role: unknown): FirmRole | null {
  if (typeof role !== 'string') return null;
  const normalized = role.toLowerCase();
  return isFirmRole(normalized) ? normalized : null;
}

export function canEditCases(role: unknown | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'attorney';
}

export function canEditDocuments(role: unknown | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'attorney';
}

export function canDeleteDocuments(role: unknown | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin' || normalized === 'attorney';
}

export function canManageMembers(role: unknown | null | undefined): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'admin';
}
