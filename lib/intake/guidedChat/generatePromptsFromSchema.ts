import type { FieldDef, SchemaDef, SectionDef } from '../schemas/types';
import { formatLabel } from '../validation';
import type { FieldPrompt, PromptLibrary, SectionPromptSet } from './types';

const FIELD_REVEALS: Record<string, { whenValue: unknown; revealPaths: string[] }> = {
  opposing_address_known: {
    whenValue: true,
    revealPaths: ['opposing_last_known_address'],
  },
  dv_present: {
    whenValue: true,
    revealPaths: ['protective_order_exists'],
  },
  currently_cohabitating: {
    whenValue: false,
    revealPaths: ['date_of_separation'],
  },
  // Progressive disclosure for assets
  assets_present: {
    whenValue: true,
    revealPaths: ['asset_type', 'ownership', 'estimated_value', 'title_holder', 'acquired_pre_marriage'],
  },
  // Progressive disclosure for debts
  debts_present: {
    whenValue: true,
    revealPaths: ['debt_type', 'amount', 'responsible_party', 'incurred_during_marriage'],
  },
};

function buildNarrativePrompt(section: SectionDef) {
  return {
    id: `${section.id}:narrative`,
    prompt: `If you'd like, share any context about ${section.title.toLowerCase()} in your own words.`,
    helperText: 'You can skip this or say "I\'m not sure".',
    optional: true as const,
  };
}

function buildFieldPrompt(field: FieldDef): Omit<FieldPrompt, 'askIfMissing' | 'fieldKey'> {
  const label = formatLabel(field.key);
  const helperText = 'You can say "I\'m not sure" or skip for now.';

  switch (field.type) {
    case 'date':
      return {
        prompt: `What is the date for ${label}?`,
        helperText: `${helperText} Example: 2024-01-15.`,
      };
    case 'number':
      return {
        prompt: `What is the estimated ${label}?`,
        helperText,
      };
    case 'boolean':
      return {
        prompt: `Is ${label.toLowerCase()} true for your situation?`,
        helperText: 'You can reply yes or no, or say "I\'m not sure".',
      };
    case 'enum':
      return {
        prompt: `Which option best fits for ${label}?`,
        helperText: `${helperText} You can also choose from the form options.`,
      };
    case 'multiselect':
      return {
        prompt: `Which of these apply for ${label}?`,
        helperText,
      };
    case 'structured':
      return {
        prompt: `Do you know the address for ${label}? If so, please enter it in the form.`,
        helperText,
      };
    case 'list':
      return {
        prompt: `Are there any ${label.toLowerCase()} to add?`,
        helperText,
      };
    case 'text':
    default:
      return {
        prompt: `What should we record for ${label}?`,
        helperText,
      };
  }
}

export function generatePromptsFromSchema(schema: SchemaDef): PromptLibrary {
  const sections: Record<string, SectionPromptSet> = {};

  schema.sections.forEach((section) => {
    const fieldPrompts: Record<string, FieldPrompt> = {};

    section.fields.forEach((field) => {
      if (field.isSystem) return;
      const base = buildFieldPrompt(field);
      fieldPrompts[field.key] = {
        fieldKey: field.key,
        prompt: base.prompt,
        helperText: base.helperText,
        revealOn: FIELD_REVEALS[field.key],
        askIfMissing: Boolean(field.required),
      };
    });

    sections[section.id] = {
      sectionId: section.id,
      sectionTitle: section.title,
      narrativePrompt: buildNarrativePrompt(section),
      fieldPrompts,
    };
  });

  return {
    version: schema.version,
    sections,
  };
}
