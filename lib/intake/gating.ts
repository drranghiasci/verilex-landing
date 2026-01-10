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

export function getEnabledSectionIds(matterType: unknown): Set<string> {
  const normalized = normalizeMatterType(matterType);
  if (!normalized) {
    return new Set(ALWAYS_SECTIONS);
  }

  const enabled = new Set<string>(ALWAYS_SECTIONS);

  if (normalized === 'divorce') {
    DIVORCE_ONLY_SECTIONS.forEach((sectionId) => enabled.add(sectionId));
  }

  if (normalized && SUPPORT_RELEVANT_MATTER_TYPES.has(normalized)) {
    enabled.add('income_support');
  }

  return enabled;
}

export function getSectionTitleForMatterType(sectionId: string, matterType: unknown): string {
  const normalized = normalizeMatterType(matterType);
  if (normalized && normalized in SECTION_TITLE_OVERRIDES) {
    const overrides = SECTION_TITLE_OVERRIDES[normalized as keyof typeof SECTION_TITLE_OVERRIDES];
    if (overrides && overrides[sectionId as keyof typeof overrides]) {
      return overrides[sectionId as keyof typeof overrides];
    }
  }
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
