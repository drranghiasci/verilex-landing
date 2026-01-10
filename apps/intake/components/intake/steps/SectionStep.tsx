import React from 'react';
import {
  formatLabel,
  getSectionById,
  getSectionTitle,
  isFieldRequired,
  isRepeatableSection,
  shouldShowField,
} from '../../../../../lib/intake/validation';
import EnumSelect from '../fields/EnumSelect';
import CountySelect from '../fields/CountySelect';
import type { IntakeDocument } from '../../../../../lib/intake/intakeApi';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

export type StepProps = {
  sectionId: string;
  payload: Record<string, unknown>;
  missingKeys: Set<string>;
  disabled?: boolean;
  documents?: IntakeDocument[];
  token?: string;
  intakeId?: string;
  onReload?: () => void;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  onFieldChange: (key: string, value: unknown) => void;
};

function formatDateValue(value: unknown) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.includes('T') ? trimmed.split('T')[0] ?? '' : trimmed;
}

function isMissing(missingKeys: Set<string>, key: string) {
  return missingKeys.has(key);
}

function shouldHideField(hiddenFields: string[] | undefined, key: string) {
  if (!hiddenFields || hiddenFields.length === 0) return false;
  return hiddenFields.includes(key);
}

function isReadOnlyField(readOnlyFields: string[] | undefined, key: string) {
  if (!readOnlyFields || readOnlyFields.length === 0) return false;
  return readOnlyFields.includes(key);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function humanizeEnumValue(value: string): string {
  return value
    .replace(/-/g, ' ')
    .split(/[_ ]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const ENUM_LABELS: Record<string, Record<string, string>> = {
  grounds_for_divorce: {
    no_fault: 'Irretrievably broken (no-fault)',
  },
  citizenship_status: {
    us_citizen: 'U.S. citizen',
    lawful_permanent_resident: 'Lawful permanent resident (green card)',
    nonimmigrant_visa_holder: 'Visa holder (temporary)',
    undocumented: 'Undocumented',
    dual_citizen: 'Dual citizen',
    unknown: "I'm not sure",
    prefer_not_to_say: 'Prefer not to say',
  },
  opposing_employment_status: {
    employed_full_time: 'Employed full-time',
    employed_part_time: 'Employed part-time',
    self_employed: 'Self-employed',
    unemployed: 'Unemployed',
    student: 'Student',
    retired: 'Retired',
    disabled: 'Disabled',
    unknown: "I'm not sure",
  },
  ownership: {
    sole_client: 'Owned by me',
    sole_opposing: 'Owned by the other party',
    joint: 'Jointly owned',
    third_party: 'Owned by a third party',
    unknown: "I'm not sure",
  },
  title_holder: {
    client: 'Me',
    opposing: 'The other party',
    both: 'Both of us',
    third_party: 'Someone else',
    unknown: "I'm not sure",
  },
  responsible_party: {
    client: 'Me',
    opposing: 'The other party',
    both: 'Both of us',
    third_party: 'Someone else',
    unknown: "I'm not sure",
  },
  settlement_preference: {
    strongly_prefer_settlement: 'Strongly prefer settlement',
    prefer_settlement: 'Prefer settlement if possible',
    open_to_either: 'Open to either',
    prefer_litigation: 'Prefer litigation',
    strongly_prefer_litigation: 'Strongly prefer litigation',
    unsure: 'Not sure yet',
  },
  litigation_tolerance: {
    low: 'Low (I want to avoid court if possible)',
    moderate: 'Moderate',
    high: 'High (I am prepared for litigation)',
    unknown: "I'm not sure",
  },
};

function getEnumLabel(fieldKey: string, value: string): string {
  const fieldLabels = ENUM_LABELS[fieldKey];
  if (fieldLabels && fieldLabels[value]) {
    return fieldLabels[value];
  }

  return humanizeEnumValue(value);
}

function buildEnumOptions(fieldKey: string, enumValues: string[] | undefined) {
  if (!enumValues) return [];
  return enumValues.map((option) => ({
    value: option,
    label: getEnumLabel(fieldKey, option),
  }));
}

function defaultValueForType(type: string) {
  if (type === 'number') return undefined;
  if (type === 'boolean') return undefined;
  if (type === 'structured') return {};
  if (type === 'multiselect' || type === 'list' || type === 'array') return [];
  return '';
}

const ADDRESS_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'line1', label: 'Address Line 1' },
  { key: 'line2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'ZIP' },
];

function toAddressValue(value: unknown): Record<string, string> {
  if (isPlainObject(value)) {
    const record = value as Record<string, unknown>;
    const next: Record<string, string> = {};
    for (const field of ADDRESS_FIELDS) {
      const fieldValue = record[field.key];
      if (typeof fieldValue === 'string') next[field.key] = fieldValue;
    }
    if (!next.line1 && typeof record.freeform === 'string') {
      next.line1 = record.freeform;
    }
    return next;
  }
  if (typeof value === 'string' && value.trim()) {
    return { line1: value };
  }
  return {};
}

function FieldRow({
  label,
  required,
  notes,
  children,
  invalid,
}: {
  label: string;
  required: boolean;
  notes?: string;
  children: React.ReactNode;
  invalid: boolean;
}) {
  return (
    <div className={`field ${invalid ? 'field--invalid' : ''}`}>
      <label className="field__label">
        <span>{label}</span>
        {required && <span className="field__required">Required</span>}
      </label>
      <div className="field__control">{children}</div>
      {notes && <div className="field__notes">{notes}</div>}
      {invalid && <div className="field__error">This field is required.</div>}
    </div>
  );
}

export function SectionStep({
  sectionId,
  payload,
  missingKeys,
  disabled,
  hiddenFields,
  readOnlyFields,
  onFieldChange,
}: StepProps) {
  const section = getSectionById(sectionId);
  if (!section) {
    return <div className="step">Unknown section.</div>;
  }

  const sectionTitle = getSectionTitle(sectionId);
  const isReadOnly = Boolean(disabled);
  const repeatable = isRepeatableSection(sectionId);

  const renderTextField = (
    key: string,
    notes?: string,
    required = false,
    valueOverride?: string,
  ) => (
    <FieldRow
      label={formatLabel(key)}
      required={required}
      notes={notes}
      invalid={isMissing(missingKeys, key)}
    >
      <Input
        type="text"
        value={valueOverride ?? (typeof payload[key] === 'string' ? (payload[key] as string) : '')}
        onChange={(event) => onFieldChange(key, event.target.value)}
        disabled={isReadOnly}
      />
    </FieldRow>
  );

  const renderDateField = (key: string, notes?: string, required = false, valueOverride?: string) => (
    <FieldRow
      label={formatLabel(key)}
      required={required}
      notes={notes}
      invalid={isMissing(missingKeys, key)}
    >
      <Input
        type="date"
        value={valueOverride ?? formatDateValue(payload[key])}
        onChange={(event) => onFieldChange(key, event.target.value)}
        disabled={isReadOnly}
      />
    </FieldRow>
  );

  const renderNumberField = (
    key: string,
    notes?: string,
    required = false,
    valueOverride?: number | string,
  ) => (
    <FieldRow
      label={formatLabel(key)}
      required={required}
      notes={notes}
      invalid={isMissing(missingKeys, key)}
    >
      <Input
        type="number"
        step="0.01"
        value={valueOverride ?? (typeof payload[key] === 'number' ? String(payload[key]) : '')}
        onChange={(event) => {
          const nextValue = event.target.value;
          onFieldChange(key, nextValue === '' ? undefined : Number(nextValue));
        }}
        disabled={isReadOnly}
      />
    </FieldRow>
  );

  const renderBooleanField = (
    key: string,
    notes?: string,
    required = false,
    valueOverride?: boolean | undefined,
  ) => {
    const currentValue = valueOverride ?? payload[key];
    return (
      <FieldRow
        label={formatLabel(key)}
        required={required}
        notes={notes}
        invalid={isMissing(missingKeys, key)}
      >
        <div className="toggle">
          <Button
            variant="unstyled"
            className={`toggle__btn ${currentValue === true ? 'is-active' : ''}`}
            onClick={() => onFieldChange(key, true)}
            disabled={isReadOnly}
          >
            Yes
          </Button>
          <Button
            variant="unstyled"
            className={`toggle__btn ${currentValue === false ? 'is-active' : ''}`}
            onClick={() => onFieldChange(key, false)}
            disabled={isReadOnly}
          >
            No
          </Button>
        </div>
      </FieldRow>
    );
  };

  const renderEnumField = (
    key: string,
    enumValues: string[] | undefined,
    notes?: string,
    required = false,
    valueOverride?: string,
  ) => {
    if (!enumValues || enumValues.length === 0) {
      return renderTextField(key, notes, required, valueOverride);
    }

    return (
      <EnumSelect
        label={formatLabel(key)}
        value={valueOverride ?? (typeof payload[key] === 'string' ? (payload[key] as string) : '')}
        options={buildEnumOptions(key, enumValues)}
        onChange={(nextValue) => onFieldChange(key, nextValue)}
        required={required}
        helpText={notes}
        invalid={isMissing(missingKeys, key)}
        disabled={isReadOnly}
      />
    );
  };

  const renderCountyField = (key: string, notes?: string, required = false) => (
    <CountySelect
      value={typeof payload[key] === 'string' ? (payload[key] as string) : ''}
      onChange={(nextValue) => onFieldChange(key, nextValue)}
      label={formatLabel(key)}
      required={required}
      notes={notes}
      invalid={isMissing(missingKeys, key)}
      disabled={isReadOnly}
    />
  );

  const renderMultiSelectField = (
    key: string,
    enumValues: string[] | undefined,
    notes?: string,
    required = false,
  ) => {
    const currentValues = getArrayValue(payload[key]).filter(
      (entry): entry is string => typeof entry === 'string',
    );

    if (!enumValues || enumValues.length === 0) {
      return renderArrayStringField(key, currentValues, notes, required);
    }

    return (
      <FieldRow
        label={formatLabel(key)}
        required={required}
        notes={notes}
        invalid={isMissing(missingKeys, key)}
      >
        <div className="multi-select">
          {enumValues.map((option) => {
            const checked = currentValues.includes(option);
            return (
              <label key={option} className="multi-select__option">
                <Input
                  type="checkbox"
                  checked={checked}
                  unstyled
                  onChange={() => {
                    const next = checked
                      ? currentValues.filter((value) => value !== option)
                      : [...currentValues, option];
                    onFieldChange(key, next);
                  }}
                  disabled={isReadOnly}
                />
                <span>{getEnumLabel(key, option)}</span>
              </label>
            );
          })}
        </div>
      </FieldRow>
    );
  };

  const renderAddressField = (key: string, notes?: string, required = false) => {
    const address = toAddressValue(payload[key]);
    return (
      <FieldRow
        label={formatLabel(key)}
        required={required}
        notes={notes}
        invalid={isMissing(missingKeys, key)}
      >
        <div className="address-grid">
          {ADDRESS_FIELDS.map((field) => (
            <div key={field.key} className="address-grid__item">
              <label className="address-grid__label">{field.label}</label>
              <Input
                type="text"
                value={address[field.key] ?? ''}
                onChange={(event) =>
                  onFieldChange(key, { ...address, [field.key]: event.target.value })
                }
                disabled={isReadOnly}
              />
            </div>
          ))}
        </div>
      </FieldRow>
    );
  };

  const renderArrayStringField = (
    key: string,
    items: unknown[],
    notes?: string,
    required = false,
  ) => (
    <FieldRow
      label={formatLabel(key)}
      required={required}
      notes={notes}
      invalid={isMissing(missingKeys, key)}
    >
      <div className="list">
        {items.map((item, index) => (
          <div key={`${key}-${index}`} className="list__row">
            <Input
              type="text"
              value={typeof item === 'string' ? item : ''}
              onChange={(event) => {
                const next = [...items];
                next[index] = event.target.value;
                onFieldChange(key, next);
              }}
              disabled={isReadOnly}
            />
            <Button
              variant="unstyled"
              className="list__remove"
              onClick={() => {
                const next = items.filter((_, idx) => idx !== index);
                onFieldChange(key, next);
              }}
              disabled={isReadOnly}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          variant="unstyled"
          className="list__add"
          onClick={() => onFieldChange(key, [...items, ''])}
          disabled={isReadOnly}
        >
          Add item
        </Button>
      </div>
    </FieldRow>
  );

  const renderRepeatableSection = () => {
    const fields = section.fields;
    const arrays = fields.map((field) => ({
      field,
      values: getArrayValue(payload[field.key]),
    }));
    const maxLength = arrays.reduce((max, item) => Math.max(max, item.values.length), 0);
    const count = Math.max(1, maxLength);

    const updateFieldValue = (key: string, index: number, value: unknown) => {
      const current = getArrayValue(payload[key]);
      const next = [...current];
      next[index] = value;
      onFieldChange(key, next);
    };

    const addItem = () => {
      fields.forEach((field) => {
        const current = getArrayValue(payload[field.key]);
        const next = [...current, defaultValueForType(field.type)];
        onFieldChange(field.key, next);
      });
    };

    const removeItem = (index: number) => {
      fields.forEach((field) => {
        const current = getArrayValue(payload[field.key]);
        const next = current.filter((_, idx) => idx !== index);
        onFieldChange(field.key, next);
      });
    };

    const renderRepeatableField = (
      fieldKey: string,
      fieldType: string,
      fieldValue: unknown,
      required: boolean,
      index: number,
      notes?: string,
      enumValues?: string[],
    ) => {
      const label = formatLabel(fieldKey);
      const invalid = isMissing(missingKeys, fieldKey);

      if (fieldType === 'date') {
        return (
          <FieldRow key={fieldKey} label={label} required={required} notes={notes} invalid={invalid}>
            <Input
              type="date"
              value={formatDateValue(fieldValue)}
              onChange={(event) => updateFieldValue(fieldKey, index, event.target.value)}
              disabled={isReadOnly}
            />
          </FieldRow>
        );
      }

      if (fieldType === 'number') {
        return (
          <FieldRow key={fieldKey} label={label} required={required} notes={notes} invalid={invalid}>
            <Input
              type="number"
              step="0.01"
              value={typeof fieldValue === 'number' ? String(fieldValue) : ''}
              onChange={(event) => {
                const nextValue = event.target.value;
                updateFieldValue(fieldKey, index, nextValue === '' ? undefined : Number(nextValue));
              }}
              disabled={isReadOnly}
            />
          </FieldRow>
        );
      }

      if (fieldType === 'boolean') {
        return (
          <FieldRow key={fieldKey} label={label} required={required} notes={notes} invalid={invalid}>
            <div className="toggle">
              <Button
                variant="unstyled"
                className={`toggle__btn ${fieldValue === true ? 'is-active' : ''}`}
                onClick={() => updateFieldValue(fieldKey, index, true)}
                disabled={isReadOnly}
              >
                Yes
              </Button>
              <Button
                variant="unstyled"
                className={`toggle__btn ${fieldValue === false ? 'is-active' : ''}`}
                onClick={() => updateFieldValue(fieldKey, index, false)}
                disabled={isReadOnly}
              >
                No
              </Button>
            </div>
          </FieldRow>
        );
      }

      if (fieldType === 'enum' && enumValues && enumValues.length > 0) {
        return (
          <EnumSelect
            label={label}
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            options={buildEnumOptions(fieldKey, enumValues)}
            onChange={(nextValue) => updateFieldValue(fieldKey, index, nextValue)}
            required={required}
            helpText={notes}
            invalid={invalid}
            disabled={isReadOnly}
          />
        );
      }

      return (
        <FieldRow key={fieldKey} label={label} required={required} notes={notes} invalid={invalid}>
          <Input
            type="text"
            value={typeof fieldValue === 'string' ? fieldValue : ''}
            onChange={(event) => updateFieldValue(fieldKey, index, event.target.value)}
            disabled={isReadOnly}
          />
        </FieldRow>
      );
    };

    return (
      <div className="step__grid">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`${sectionId}-${index}`} className="list__card">
            <div className="list__card-header">{formatLabel(sectionId)} #{index + 1}</div>
            {fields.map((field) => {
              const required = isFieldRequired(field.required, field.isSystem);
              const values = getArrayValue(payload[field.key]);
              const value = values[index];
              return renderRepeatableField(
                field.key,
                field.type,
                value,
                required,
                index,
                field.notes,
                field.enumValues,
              );
            })}
            <Button
              variant="unstyled"
              className="list__remove"
              onClick={() => removeItem(index)}
              disabled={isReadOnly}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button variant="unstyled" className="list__add" onClick={addItem} disabled={isReadOnly}>
          Add item
        </Button>
      </div>
    );
  };

  return (
    <div className="step">
      <div className="step__header">
        <div>
          <p className="step__eyebrow">Section</p>
          <h2 className="step__title">{sectionTitle}</h2>
          <p className="step__summary">Complete the fields below. Required items are marked.</p>
        </div>
        <div className="step__badge">Schema locked</div>
      </div>

      {repeatable ? (
        renderRepeatableSection()
      ) : (
        <div className="step__grid">
          {section.fields.map((field) => {
            if (!shouldShowField(field.key, payload)) return null;
            if (shouldHideField(hiddenFields, field.key)) return null;
            if (field.isSystem) return null;
            const required = isFieldRequired(field.required, field.isSystem);
            const fieldReadOnly = isReadOnly || isReadOnlyField(readOnlyFields, field.key);

            if (field.key === 'client_county' || field.key === 'county_of_filing') {
              return (
                <CountySelect
                  value={typeof payload[field.key] === 'string' ? (payload[field.key] as string) : ''}
                  onChange={(nextValue) => onFieldChange(field.key, nextValue)}
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                  disabled={fieldReadOnly}
                />
              );
            }

            if (field.type === 'array' || field.type === 'list') {
              const items = getArrayValue(payload[field.key]);
              return renderArrayStringField(field.key, items, field.notes, required);
            }

            if (field.type === 'text') {
              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <Input
                    type="text"
                    value={typeof payload[field.key] === 'string' ? (payload[field.key] as string) : ''}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    disabled={fieldReadOnly}
                  />
                </FieldRow>
              );
            }

            if (field.type === 'date') {
              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <Input
                    type="date"
                    value={formatDateValue(payload[field.key])}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    disabled={fieldReadOnly}
                  />
                </FieldRow>
              );
            }

            if (field.type === 'number') {
              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <Input
                    type="number"
                    step="0.01"
                    value={typeof payload[field.key] === 'number' ? String(payload[field.key]) : ''}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      onFieldChange(field.key, nextValue === '' ? undefined : Number(nextValue));
                    }}
                    disabled={fieldReadOnly}
                  />
                </FieldRow>
              );
            }

            if (field.type === 'boolean') {
              const currentValue = payload[field.key];
              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <div className="toggle">
                    <Button
                      variant="unstyled"
                      className={`toggle__btn ${currentValue === true ? 'is-active' : ''}`}
                      onClick={() => onFieldChange(field.key, true)}
                      disabled={fieldReadOnly}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="unstyled"
                      className={`toggle__btn ${currentValue === false ? 'is-active' : ''}`}
                      onClick={() => onFieldChange(field.key, false)}
                      disabled={fieldReadOnly}
                    >
                      No
                    </Button>
                  </div>
                </FieldRow>
              );
            }

            if (field.type === 'enum') {
              if (!field.enumValues || field.enumValues.length === 0) {
                return renderTextField(field.key, field.notes, required);
              }

              return (
                <EnumSelect
                  label={formatLabel(field.key)}
                  value={typeof payload[field.key] === 'string' ? (payload[field.key] as string) : ''}
                  options={buildEnumOptions(field.key, field.enumValues)}
                  onChange={(nextValue) => onFieldChange(field.key, nextValue)}
                  required={required}
                  helpText={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                  disabled={fieldReadOnly}
                />
              );
            }

            if (field.type === 'multiselect') {
              const currentValues = getArrayValue(payload[field.key]).filter(
                (entry): entry is string => typeof entry === 'string',
              );

              if (!field.enumValues || field.enumValues.length === 0) {
                return renderArrayStringField(field.key, currentValues, field.notes, required);
              }

              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <div className="multi-select">
                    {field.enumValues.map((option) => {
                      const checked = currentValues.includes(option);
                      return (
                        <label key={option} className="multi-select__option">
                          <Input
                            type="checkbox"
                            checked={checked}
                            unstyled
                            onChange={() => {
                              const next = checked
                                ? currentValues.filter((value) => value !== option)
                                : [...currentValues, option];
                              onFieldChange(field.key, next);
                            }}
                            disabled={fieldReadOnly}
                          />
                          <span>{getEnumLabel(field.key, option)}</span>
                        </label>
                      );
                    })}
                  </div>
                </FieldRow>
              );
            }

            if (field.type === 'structured') {
              const address = toAddressValue(payload[field.key]);
              return (
                <FieldRow
                  label={formatLabel(field.key)}
                  required={required}
                  notes={field.notes}
                  invalid={isMissing(missingKeys, field.key)}
                >
                  <div className="address-grid">
                    {ADDRESS_FIELDS.map((fieldItem) => (
                      <div key={fieldItem.key} className="address-grid__item">
                        <label className="address-grid__label">{fieldItem.label}</label>
                        <Input
                          type="text"
                          value={address[fieldItem.key] ?? ''}
                          onChange={(event) =>
                            onFieldChange(field.key, { ...address, [fieldItem.key]: event.target.value })
                          }
                          disabled={fieldReadOnly}
                        />
                      </div>
                    ))}
                  </div>
                </FieldRow>
              );
            }

            return renderTextField(field.key, field.notes, required);
          })}
        </div>
      )}
    </div>
  );
}
