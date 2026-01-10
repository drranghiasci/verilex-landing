type Payload = Record<string, unknown>;

export type ConsistencyWarning = {
  key: string;
  message: string;
  paths: string[];
};

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function hasNonEmptyString(value: unknown): boolean {
  return toStringValue(value).length > 0;
}

export function runConsistencyChecks(payload: Payload) {
  const warnings: ConsistencyWarning[] = [];

  if (payload.currently_cohabitating === true && hasNonEmptyString(payload.date_of_separation)) {
    warnings.push({
      key: 'cohabitating_with_separation',
      message: 'Currently cohabitating is marked Yes, but a separation date is provided.',
      paths: ['currently_cohabitating', 'date_of_separation'],
    });
  }

  const childrenArrays = [
    payload.child_full_name,
    payload.child_dob,
    payload.child_current_residence,
    payload.biological_relation,
  ];
  const hasChildrenEntries = childrenArrays.some((value) => toArray(value).length > 0);
  if (hasNonEmptyString(payload.custody_type_requested) && !hasChildrenEntries) {
    warnings.push({
      key: 'custody_without_children',
      message: 'Custody type is selected, but no child entries are listed.',
      paths: ['custody_type_requested', 'child_full_name'],
    });
  }

  const faultAllegations = toArray(payload.fault_allegations).filter((value) =>
    hasNonEmptyString(value),
  );
  if (faultAllegations.length > 0 && payload.uploaded !== true) {
    warnings.push({
      key: 'fault_allegations_without_uploads',
      message: 'Fault allegations are listed, but documents are marked as not uploaded.',
      paths: ['fault_allegations', 'uploaded'],
    });
  }

  if (payload.dv_present === false && payload.protective_order_exists === true) {
    warnings.push({
      key: 'protective_order_without_dv',
      message: 'Protective order is marked Yes, but domestic violence is marked No.',
      paths: ['dv_present', 'protective_order_exists'],
    });
  }

  return { warnings };
}
