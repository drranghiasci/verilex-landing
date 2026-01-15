import { GA_DIVORCE_CUSTODY_V1 } from '../schema/gaDivorceCustodyV1';
import type { SchemaDef } from '../schema/types';
import { generatePromptsFromSchema } from './generatePromptsFromSchema';
import type { PromptLibrary } from './types';
export type { PromptLibrary };

export function assertPromptCoverage(schema: SchemaDef, library: PromptLibrary) {
  const missing: string[] = [];

  schema.sections.forEach((section) => {
    const libSection = library.sections[section.id];
    if (!libSection) {
      missing.push(`section:${section.id}`);
      return;
    }
    section.fields.forEach((field) => {
      if (field.isSystem) return;
      if (!libSection.fieldPrompts[field.key]) {
        missing.push(`${section.id}.${field.key}`);
      }
    });
    if (!libSection.narrativePrompt) {
      missing.push(`${section.id}.narrative`);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Guided chat prompt coverage missing: ${missing.join(', ')}`);
  }
}

export const GUIDED_PROMPT_LIBRARY = generatePromptsFromSchema(GA_DIVORCE_CUSTODY_V1);

if (process.env.NODE_ENV !== 'production') {
  assertPromptCoverage(GA_DIVORCE_CUSTODY_V1, GUIDED_PROMPT_LIBRARY);
}
