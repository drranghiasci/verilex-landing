import { GA_DIVORCE_CUSTODY_V1 } from './schema/gaDivorceCustodyV1';
import type { FieldDef, SchemaDef, SectionDef } from './schema/types';

type Payload = Record<string, unknown>;

type FieldCondition = (payload: Payload) => boolean;

const conditionalVisibility: Record<string, FieldCondition> = {
  opposing_last_known_address: (payload) => payload.opposing_address_known === true,
  protective_order_exists: (payload) => payload.dv_present === true,
  date_of_separation: (payload) => payload.currently_cohabitating === false,
};

const repeatableSectionIds = new Set(['child_object', 'asset_object', 'debt_object']);

const fieldToSectionId = new Map<string, string>();
const sectionById = new Map<string, SectionDef>();

for (const section of GA_DIVORCE_CUSTODY_V1.sections) {
  sectionById.set(section.id, section);
  for (const field of section.fields) {
    fieldToSectionId.set(field.key, section.id);
  }
}

export const intakeSections = GA_DIVORCE_CUSTODY_V1.sections;

export function getSectionById(sectionId: string): SectionDef | undefined {
  return sectionById.get(sectionId);
}

export function getSectionTitle(sectionId: string): string {
  return sectionById.get(sectionId)?.title ?? sectionId;
}

export function shouldShowField(fieldKey: string, payload: Payload): boolean {
  const condition = conditionalVisibility[fieldKey];
  return condition ? condition(payload) : true;
}

export function isFieldRequired(required: boolean, isSystem?: boolean): boolean {
  return required && !isSystem;
}

export function isRepeatableSection(sectionId: string): boolean {
  return repeatableSectionIds.has(sectionId);
}

export function formatLabel(key: string): string {
  return key
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasObjectValue(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return Object.values(value).some((entry) => {
    if (typeof entry === 'string') return entry.trim().length > 0;
    if (typeof entry === 'number') return !Number.isNaN(entry);
    if (typeof entry === 'boolean') return true;
    return entry !== undefined && entry !== null;
  });
}

function hasValue(value: unknown, type: string): boolean {
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number' && !Number.isNaN(value);
  if (type === 'array' || type === 'list') return Array.isArray(value) && value.length > 0;
  if (type === 'multiselect') return Array.isArray(value) && value.length > 0;
  if (type === 'structured') return hasObjectValue(value);
  if (type === 'date') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'enum') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'text') return typeof value === 'string' && value.trim().length > 0;
  return typeof value === 'string' ? value.trim().length > 0 : value !== undefined && value !== null;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

export type ValidationResult = {
  missingKeys: string[];
  missingBySection: Record<string, string[]>;
};

export type ValidationSummary = {
  errorsByPath: Record<string, string[]>;
  missingRequiredPaths: string[];
};

export type EnumValidationResult = {
  invalidKeys: string[];
  invalidBySection: Record<string, string[]>;
};

function pathToFieldKey(path: string) {
  const match = path.match(/^([a-zA-Z0-9_]+)/);
  return match ? match[1] : path;
}

export function validate(payload: Payload, schema: SchemaDef = GA_DIVORCE_CUSTODY_V1): ValidationSummary {
  const errorsByPath: Record<string, string[]> = {};
  const missingRequiredPaths: string[] = [];

  const addMissing = (path: string, message: string) => {
    missingRequiredPaths.push(path);
    errorsByPath[path] = errorsByPath[path] ? [...errorsByPath[path], message] : [message];
  };

  for (const section of schema.sections) {
    if (isRepeatableSection(section.id)) {
      const fieldArrays = section.fields.map((field) => ({
        field,
        values: toArray(payload[field.key]),
      }));

      const count = fieldArrays.reduce((max, item) => Math.max(max, item.values.length), 0);

      for (const { field, values } of fieldArrays) {
        if (!isFieldRequired(field.required, field.isSystem)) continue;
        if (count === 0) {
          addMissing(field.key, `${formatLabel(field.key)} is required.`);
          continue;
        }

        for (let index = 0; index < count; index += 1) {
          const value = values[index];
          if (!hasValue(value, field.type)) {
            addMissing(
              `${field.key}[${index}]`,
              `${formatLabel(field.key)} (item ${index + 1}) is required.`,
            );
          }
        }
      }

      continue;
    }

    for (const field of section.fields) {
      if (!shouldShowField(field.key, payload)) continue;
      if (!isFieldRequired(field.required, field.isSystem)) continue;
      if (!hasValue(payload[field.key], field.type)) {
        addMissing(field.key, `${formatLabel(field.key)} is required.`);
      }
    }
  }

  return { errorsByPath, missingRequiredPaths };
}

export function validateIntakePayload(payload: Payload): ValidationResult {
  const { missingRequiredPaths } = validate(payload);
  const missingKeys = new Set<string>();
  const missingBySection: Record<string, string[]> = {};

  for (const path of missingRequiredPaths) {
    const key = pathToFieldKey(path);
    if (missingKeys.has(key)) continue;
    missingKeys.add(key);
    const sectionId = fieldToSectionId.get(key) ?? 'unknown';
    if (!missingBySection[sectionId]) missingBySection[sectionId] = [];
    missingBySection[sectionId].push(key);
  }

  return {
    missingKeys: Array.from(missingKeys),
    missingBySection,
  };
}

export function validateEnumMembership(payload: Payload): EnumValidationResult {
  const invalid = new Set<string>();
  const invalidBySection: Record<string, string[]> = {};

  const addInvalid = (key: string) => {
    if (invalid.has(key)) return;
    invalid.add(key);
    const sectionId = fieldToSectionId.get(key) ?? 'unknown';
    if (!invalidBySection[sectionId]) invalidBySection[sectionId] = [];
    invalidBySection[sectionId].push(key);
  };

  for (const section of GA_DIVORCE_CUSTODY_V1.sections) {
    for (const field of section.fields) {
      if (field.isSystem) continue;
      if (!field.enumValues || field.enumValues.length === 0) continue;

      if (field.type === 'enum') {
        const value = payload[field.key];
        if (typeof value === 'string' && value.trim().length > 0) {
          if (!field.enumValues.includes(value)) addInvalid(field.key);
        }
      }

      if (field.type === 'multiselect') {
        const values = toArray(payload[field.key]).filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0,
        );
        if (values.length > 0 && values.some((value) => !field.enumValues?.includes(value))) {
          addInvalid(field.key);
        }
      }
    }
  }

  return {
    invalidKeys: Array.from(invalid),
    invalidBySection,
  };
}
