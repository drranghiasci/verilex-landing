import type { ConsistencyWarning } from './consistencyChecks';
import {
  COUNTY_WARNING_COPY,
  MODIFICATION_PROMPTS,
  SAFETY_BANNER_COPY,
  SECTION_CONTEXT_COPY,
  SECTION_TITLE_OVERRIDES,
} from './copy';
import { GA_DIVORCE_CUSTODY_V1 } from './schema/gaDivorceCustodyV1';

type Payload = Record<string, unknown>;

export type SafetyBanner = {
  key: string;
  variant: 'info' | 'error';
  title: string;
  lines: string[];
};

export type GuidedPromptOverride = {
  prompt: string;
  fieldKey: string;
  fieldType?: 'text' | 'boolean';
};

const ALWAYS_SECTIONS = new Set([
  'matter_metadata',
  'client_identity',
  'opposing_party',
  'child_object',
  'children_custody',
  'domestic_violence_risk',
  'jurisdiction_venue',
  'prior_legal_actions',
  'desired_outcomes',
  'evidence_documents',
]);

const DIVORCE_ONLY_SECTIONS = new Set([
  'marriage_details',
  'separation_grounds',
  'asset_object',
  'income_support',
  'debt_object',
]);

const SUPPORT_RELEVANT_MATTER_TYPES = new Set(['custody', 'modification', 'legitimation']);

function normalizeMatterType(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getEnabledSectionIds(payload: Payload): Set<string> {
  const matterType = normalizeMatterType(payload.matter_type);
  const hasChildren = payload.has_children;

  // Base sections that are truly always present
  const enabled = new Set(['matter_metadata', 'client_identity']);

  if (!matterType) {
    // If we don't know matter type yet, maybe show minimal or everything?
    // Let's stick to base for now until matter_type is selected
    return new Set(ALWAYS_SECTIONS);
  }

  // Divorce Logic
  if (matterType === 'divorce') {
    enabled.add('marriage_details');
    enabled.add('separation_grounds');
    enabled.add('asset_object');
    enabled.add('debt_object');
    enabled.add('income_support'); // Alimony is standard in divorce unless waived, but logic is fine
    enabled.add('opposing_party');
    enabled.add('jurisdiction_venue');
    enabled.add('prior_legal_actions');
    enabled.add('desired_outcomes');
    enabled.add('evidence_documents');
    enabled.add('domestic_violence_risk');
  } else {
    // Custody / Modification / Legitimation
    enabled.add('opposing_party');
    enabled.add('jurisdiction_venue');
    enabled.add('prior_legal_actions');
    enabled.add('desired_outcomes');
    enabled.add('evidence_documents');
    enabled.add('domestic_violence_risk');

    // Support usually relevant
    if (SUPPORT_RELEVANT_MATTER_TYPES.has(matterType)) {
      enabled.add('income_support');
    }
  }

  // Children Logic
  // If has_children is explicitly FALSE, we skip child sections
  // If has_children is TRUE or NULL (not asked yet), we show them
  // BUT: If matter_type is 'custody' or 'legitimation', children are implied?
  // Let's respect the flag if present.
  if (hasChildren !== false) {
    enabled.add('child_object');
    enabled.add('children_custody');
  }

  return enabled;
}

export function getSectionTitleForMatterType(sectionId: string, matterType: unknown): string {
  const normalized = normalizeMatterType(matterType);

  // 1. Try specific matter type override
  if (normalized && normalized in SECTION_TITLE_OVERRIDES) {
    const overrides = SECTION_TITLE_OVERRIDES[normalized as keyof typeof SECTION_TITLE_OVERRIDES];
    if (overrides && overrides[sectionId]) {
      return overrides[sectionId];
    }
  }

  // 2. Try default override
  const defaults = SECTION_TITLE_OVERRIDES['default'];
  if (defaults && defaults[sectionId]) {
    return defaults[sectionId];
  }

  // 3. Fallback to schema title
  const fallback = GA_DIVORCE_CUSTODY_V1.sections.find((section) => section.id === sectionId);
  return fallback?.title ?? sectionId;
}

export function getSectionContextNote(sectionId: string, matterType: unknown): string | null {
  const normalized = normalizeMatterType(matterType);
  if (normalized && normalized in SECTION_CONTEXT_COPY) {
    const notes = SECTION_CONTEXT_COPY[normalized as keyof typeof SECTION_CONTEXT_COPY];
    if (notes && notes[sectionId as keyof typeof notes]) {
      return notes[sectionId as keyof typeof notes] as string;
    }
  }
  return null;
}

export function getCountyWarnings(payload: Payload): ConsistencyWarning[] {
  const warnings: ConsistencyWarning[] = [];
  const clientCounty = typeof payload.client_county === 'string' ? payload.client_county.trim() : '';
  const filingCounty = typeof payload.county_of_filing === 'string' ? payload.county_of_filing.trim() : '';

  if (clientCounty && filingCounty && clientCounty !== filingCounty) {
    warnings.push({
      key: 'county_mismatch',
      message: COUNTY_WARNING_COPY.mismatch.message,
      paths: ['client_county', 'county_of_filing'],
    });
  }

  const residency =
    typeof payload.residency_duration_months === 'number'
      ? payload.residency_duration_months
      : typeof payload.residency_duration_months === 'string'
        ? Number(payload.residency_duration_months)
        : Number.NaN;

  if (!Number.isNaN(residency) && residency > 0 && residency < 6) {
    warnings.push({
      key: 'residency_low',
      message: COUNTY_WARNING_COPY.lowResidency.message,
      paths: ['residency_duration_months'],
    });
  }

  if (payload.opposing_resides_in_ga === false) {
    warnings.push({
      key: 'opposing_out_of_state',
      message: COUNTY_WARNING_COPY.opposingOutOfState.message,
      paths: ['opposing_resides_in_ga'],
    });
  }

  return warnings;
}

export function getSafetyBanners(payload: Payload): SafetyBanner[] {
  if (payload.immediate_safety_concerns === true) {
    return [
      {
        key: 'immediate_safety',
        variant: 'error',
        title: SAFETY_BANNER_COPY.immediate.title,
        lines: SAFETY_BANNER_COPY.immediate.lines,
      },
    ];
  }

  if (payload.dv_present === true) {
    return [
      {
        key: 'dv_present',
        variant: 'info',
        title: SAFETY_BANNER_COPY.dvPresent.title,
        lines: SAFETY_BANNER_COPY.dvPresent.lines,
      },
    ];
  }

  return [];
}

export function getGuidedPromptOverride(
  sectionId: string,
  matterType: unknown,
): GuidedPromptOverride | null {
  const normalized = normalizeMatterType(matterType);
  if (normalized === 'modification') {
    const prompt = MODIFICATION_PROMPTS[sectionId as keyof typeof MODIFICATION_PROMPTS];
    if (!prompt) return null;
    return {
      prompt,
      fieldKey: 'modification_existing_order',
      fieldType: 'boolean',
    };
  }
  return null;
}
