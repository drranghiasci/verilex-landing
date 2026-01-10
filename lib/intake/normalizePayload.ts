import { GA_DIVORCE_CUSTODY_V1 } from './schema/gaDivorceCustodyV1';

type Payload = Record<string, unknown>;

const canonicalKeys = new Set(
  GA_DIVORCE_CUSTODY_V1.sections.flatMap((section) => section.fields.map((field) => field.key)),
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildAddressValue(value: unknown, extras?: Record<string, unknown>): Record<string, string> | null {
  const address: Record<string, string> = {};
  if (isPlainObject(value)) {
    const record = value as Record<string, unknown>;
    const fields = ['line1', 'line2', 'city', 'state', 'zip'];
    for (const field of fields) {
      const entry = toTrimmedString(record[field]);
      if (entry) address[field] = entry;
    }
    if (!address.line1) {
      const freeform = toTrimmedString(record.freeform);
      if (freeform) address.line1 = freeform;
    }
  } else {
    const line1 = toTrimmedString(value);
    if (line1) address.line1 = line1;
  }

  if (extras) {
    const city = toTrimmedString(extras.city);
    const state = toTrimmedString(extras.state);
    const zip = toTrimmedString(extras.zip);
    if (city && !address.city) address.city = city;
    if (state && !address.state) address.state = state;
    if (zip && !address.zip) address.zip = zip;
  }

  return Object.keys(address).length > 0 ? address : null;
}

export function normalizePayloadToDocxV1(input: unknown): Payload {
  if (!isPlainObject(input)) return {};
  const payload = input as Payload;
  const result: Payload = {};
  const legacyNotes: Record<string, unknown> = {
    ...(isPlainObject(payload._legacy) ? payload._legacy : {}),
    ...(isPlainObject(payload._legacy_notes) ? payload._legacy_notes : {}),
  };

  const addLegacy = (key: string, value: unknown) => {
    if (value === undefined) return;
    if (legacyNotes[key] === undefined) {
      legacyNotes[key] = value;
    }
  };

  for (const [key, value] of Object.entries(payload)) {
    if (canonicalKeys.has(key)) {
      result[key] = value;
    }
  }

  if (result.opposing_address_known === undefined && payload.opposing_known_address !== undefined) {
    result.opposing_address_known = payload.opposing_known_address;
  }

  if (result.opposing_last_known_address === undefined) {
    const address = buildAddressValue(payload.opposing_address);
    if (address) result.opposing_last_known_address = address;
  } else if (isPlainObject(result.opposing_last_known_address) && payload.opposing_address) {
    const address = buildAddressValue(payload.opposing_address);
    if (address) {
      result.opposing_last_known_address = { ...address, ...result.opposing_last_known_address };
    }
  }

  if (result.client_address === undefined) {
    const address = buildAddressValue(payload.client_address, {
      city: payload.client_city,
      state: payload.client_state,
      zip: payload.client_zip,
    });
    if (address) result.client_address = address;
  } else if (isPlainObject(result.client_address)) {
    const address = buildAddressValue(payload.client_address, {
      city: payload.client_city,
      state: payload.client_state,
      zip: payload.client_zip,
    });
    if (address) {
      result.client_address = { ...address, ...result.client_address };
    }
  }

  if (result.special_needs === undefined && payload.child_special_needs !== undefined) {
    result.special_needs = payload.child_special_needs;
  }

  if (result.prior_custody_orders === undefined && payload.prior_custody_cases !== undefined) {
    result.prior_custody_orders = payload.prior_custody_cases;
  }

  if (result.amount === undefined && payload.estimated_balance !== undefined) {
    result.amount = payload.estimated_balance;
  }

  if (result.opposing_income_known === undefined && payload.opposing_income_estimated !== undefined) {
    const estimate = payload.opposing_income_estimated;
    if (typeof estimate === 'number' && !Number.isNaN(estimate)) {
      result.opposing_income_known = true;
      addLegacy('opposing_income_estimated', estimate);
    } else {
      addLegacy('opposing_income_estimated', estimate);
    }
  }

  if (result.support_requested === undefined && typeof payload.support_type === 'string') {
    result.support_requested = payload.support_type;
  }

  if (typeof payload.support_requested === 'boolean') {
    addLegacy('support_requested_boolean', payload.support_requested);
    if (typeof result.support_requested !== 'string') {
      result.support_requested = null;
    }
  }

  if (payload.opposing_phone !== undefined) addLegacy('opposing_phone', payload.opposing_phone);
  if (payload.opposing_email !== undefined) addLegacy('opposing_email', payload.opposing_email);

  if (payload.marriage_notes !== undefined) addLegacy('marriage_notes', payload.marriage_notes);
  if (payload.fault_ground_detail !== undefined) addLegacy('fault_ground_detail', payload.fault_ground_detail);
  if (payload.separation_status !== undefined) addLegacy('separation_status', payload.separation_status);

  if (payload.child_school_info !== undefined) addLegacy('child_school_info', payload.child_school_info);
  if (payload.current_order_exists !== undefined) addLegacy('current_order_exists', payload.current_order_exists);
  if (payload.other_parent_involvement !== undefined) {
    addLegacy('other_parent_involvement', payload.other_parent_involvement);
  }

  if (payload.asset_description !== undefined) addLegacy('asset_description', payload.asset_description);
  if (payload.documentation_provided !== undefined) {
    addLegacy('documentation_provided', payload.documentation_provided);
  }
  if (payload.ownership_dispute !== undefined) addLegacy('ownership_dispute', payload.ownership_dispute);

  if (payload.income_notes !== undefined) addLegacy('income_notes', payload.income_notes);

  if (payload.debt_description !== undefined) addLegacy('debt_description', payload.debt_description);
  if (payload.estimated_balance !== undefined) addLegacy('estimated_balance', payload.estimated_balance);
  if (payload.joint_debt !== undefined) addLegacy('joint_debt', payload.joint_debt);

  if (payload.dv_description !== undefined) addLegacy('dv_description', payload.dv_description);
  if (payload.weapons_present !== undefined) addLegacy('weapons_present', payload.weapons_present);

  if (payload.venue_notes !== undefined) addLegacy('venue_notes', payload.venue_notes);

  if (payload.prior_protective_orders !== undefined) {
    addLegacy('prior_protective_orders', payload.prior_protective_orders);
  }
  if (payload.prior_case_notes !== undefined) addLegacy('prior_case_notes', payload.prior_case_notes);

  if (payload.desired_custody_outcome !== undefined) {
    addLegacy('desired_custody_outcome', payload.desired_custody_outcome);
  }
  if (payload.desired_property_outcome !== undefined) {
    addLegacy('desired_property_outcome', payload.desired_property_outcome);
  }
  if (payload.other_requests !== undefined) addLegacy('other_requests', payload.other_requests);

  if (payload.uploaded_document_links !== undefined) {
    addLegacy('uploaded_document_links', payload.uploaded_document_links);
  }
  if (payload.evidence_notes !== undefined) addLegacy('evidence_notes', payload.evidence_notes);

  if (payload.client_city !== undefined) addLegacy('client_city', payload.client_city);
  if (payload.client_state !== undefined) addLegacy('client_state', payload.client_state);
  if (payload.client_zip !== undefined) addLegacy('client_zip', payload.client_zip);
  if (payload.opposing_known_address !== undefined) {
    addLegacy('opposing_known_address', payload.opposing_known_address);
  }
  if (payload.opposing_address !== undefined) addLegacy('opposing_address', payload.opposing_address);

  for (const [key, value] of Object.entries(payload)) {
    if (!canonicalKeys.has(key) && key !== '_legacy_notes' && key !== '_legacy') {
      addLegacy(key, value);
    }
  }

  if (Object.keys(legacyNotes).length > 0) {
    result._legacy = legacyNotes;
  }

  return result;
}
