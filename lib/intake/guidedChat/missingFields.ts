import type { FieldDef, SchemaDef } from '../schemas/types';
import { isFieldRequired, isRepeatableSection, shouldShowField } from '../validation';

type Payload = Record<string, unknown>;

function hasValue(value: unknown, type: string): boolean {
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'number') return typeof value === 'number' && !Number.isNaN(value);
  if (type === 'array' || type === 'list') return Array.isArray(value) && value.length > 0;
  if (type === 'multiselect') return Array.isArray(value) && value.length > 0;
  if (type === 'structured') return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  if (type === 'date') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'enum') return typeof value === 'string' && value.trim().length > 0;
  if (type === 'text') return typeof value === 'string' && value.trim().length > 0;
  return value !== undefined && value !== null;
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function isMissingRepeatableField(field: FieldDef, payload: Payload): boolean {
  if (!isFieldRequired(field.required, field.isSystem)) return false;
  const values = toArray(payload[field.key]);
  if (values.length === 0) return true;
  return values.some((entry) => !hasValue(entry, field.type));
}

export function missingFieldsForSection(
  payload: Payload,
  schema: SchemaDef,
  sectionId: string,
): string[] {
  const section = schema.sections.find((entry) => entry.id === sectionId);
  if (!section) return [];

  const missing: string[] = [];
  const repeatable = isRepeatableSection(sectionId);

  section.fields.forEach((field) => {
    if (!isFieldRequired(field.required, field.isSystem)) return;
    if (!repeatable && !shouldShowField(field.key, payload)) return;

    if (repeatable) {
      if (isMissingRepeatableField(field, payload)) missing.push(field.key);
      return;
    }

    if (!hasValue(payload[field.key], field.type)) {
      missing.push(field.key);
    }
  });

  return missing;
}
