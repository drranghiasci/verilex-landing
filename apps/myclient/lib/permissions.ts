export type FirmRole = 'admin' | 'attorney' | 'staff' | null | undefined;

export function canEditCases(role: FirmRole): boolean {
  return role === 'admin' || role === 'attorney';
}

export function canEditDocuments(role: FirmRole): boolean {
  return role === 'admin' || role === 'attorney';
}

export function canDeleteDocuments(role: FirmRole): boolean {
  return role === 'admin' || role === 'attorney';
}

export function canManageMembers(role: FirmRole): boolean {
  return role === 'admin';
}
