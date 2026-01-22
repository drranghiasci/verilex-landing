/**
 * Intake Step Map Configuration
 *
 * Two-layer step modeling:
 * - UI Steps: What the user sees in the sidebar (fewer, combined)
 * - Schema Steps: Backend canonical steps mapped to schema sections
 *
 * The orchestrator computes completion based on schema steps,
 * then derives UI step completion from the mapping.
 */

import { extractZipFromAddress } from '../../validation';

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const ZIP_REGEX_5 = /^\d{5}$/;
export const ZIP_REGEX_9 = /^\d{5}-\d{4}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^\+?[\d\s\-()]{7,}$/;

export function validateZip(zip: unknown): boolean {
    if (typeof zip !== 'string') return false;
    const trimmed = zip.trim();
    return ZIP_REGEX_5.test(trimmed) || ZIP_REGEX_9.test(trimmed);
}

export function validateEmail(email: unknown): boolean {
    if (typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email.trim());
}

export function validatePhone(phone: unknown): boolean {
    if (typeof phone !== 'string') return false;
    return PHONE_REGEX.test(phone.trim());
}

// ============================================================================
// GATING FIELD DEFINITIONS
// ============================================================================

/**
 * Gating fields determine which steps are required.
 * These must be resolved EARLY in the flow and hard-block progress.
 */
export const GATING_FIELDS = {
    has_children: {
        field: 'has_children',
        askInStep: 'basics', // Asked early to determine step flow
        affectedSteps: ['children_custody'] as const,
    },
    assets_present: {
        field: 'assets_present',
        askInStep: 'basics',
        affectedSteps: ['assets_property'] as const,
    },
    debts_present: {
        field: 'debts_present',
        askInStep: 'basics',
        affectedSteps: ['liabilities_debts'] as const,
    },
} as const;

// ============================================================================
// SCHEMA STEP DEFINITIONS (Backend Canonical)
// ============================================================================

export type SchemaStepKey =
    | 'matter_metadata'
    | 'client_identity'
    | 'opposing_party'
    | 'marriage_details'
    | 'separation_grounds'
    | 'child_object'
    | 'children_custody'
    | 'asset_object'
    | 'income_support'
    | 'debt_object'
    | 'domestic_violence_risk'
    | 'jurisdiction_venue'
    | 'prior_legal_actions'
    | 'desired_outcomes'
    | 'evidence_documents'
    | 'final_review';

export type ConditionalRequirement = {
    field: string;
    condition: (payload: Record<string, unknown>) => boolean;
};

export type FieldValidation = {
    field: string;
    validator: (value: unknown, payload: Record<string, unknown>) => boolean;
    errorMessage: string;
};

export type SchemaStepConfig = {
    key: SchemaStepKey;
    requiredFields: string[];
    conditionalRequired: ConditionalRequirement[];
    validations: FieldValidation[];
    /** If set, this step is only required when the gating field is true */
    gatedBy?: keyof typeof GATING_FIELDS;
    /** For repeatable sections, require at least one object */
    isRepeatable?: boolean;
    repeatableRequiredFields?: string[];
};

export const SCHEMA_STEPS: SchemaStepConfig[] = [
    {
        key: 'matter_metadata',
        requiredFields: ['matter_type', 'urgency_level', 'intake_channel', 'has_children', 'assets_present', 'debts_present'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'client_identity',
        requiredFields: [
            'client_first_name',
            'client_last_name',
            'client_dob',
            'client_phone',
            'client_email',
            'client_address',
            'client_county',
        ],
        conditionalRequired: [],
        validations: [
            {
                field: 'client_email',
                validator: validateEmail,
                errorMessage: 'Please enter a valid email address.',
            },
            {
                field: 'client_phone',
                validator: validatePhone,
                errorMessage: 'Please enter a valid phone number.',
            },
            {
                field: 'client_address',
                validator: (value) => {
                    const zip = extractZipFromAddress(value);
                    return zip !== undefined && validateZip(zip);
                },
                errorMessage: 'Please enter a valid 5-digit ZIP code.',
            },
        ],
    },
    {
        key: 'opposing_party',
        requiredFields: ['opposing_first_name', 'opposing_last_name', 'opposing_address_known'],
        conditionalRequired: [
            {
                field: 'opposing_last_known_address',
                condition: (payload) => payload.opposing_address_known === true,
            },
        ],
        validations: [
            {
                field: 'opposing_last_known_address',
                validator: (value, payload) => {
                    if (payload.opposing_address_known !== true) return true;
                    const zip = extractZipFromAddress(value);
                    return zip !== undefined && validateZip(zip);
                },
                errorMessage: 'Please enter a valid 5-digit ZIP code for opposing party address.',
            },
        ],
    },
    {
        key: 'marriage_details',
        requiredFields: ['date_of_marriage', 'place_of_marriage', 'currently_cohabitating'],
        conditionalRequired: [
            {
                field: 'date_of_separation',
                condition: (payload) => payload.currently_cohabitating === false,
            },
        ],
        validations: [],
    },
    {
        key: 'separation_grounds',
        requiredFields: ['grounds_for_divorce'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'child_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
        gatedBy: 'has_children',
        isRepeatable: true,
        repeatableRequiredFields: ['child_full_name', 'child_dob', 'child_current_residence', 'biological_relation'],
    },
    {
        key: 'children_custody',
        requiredFields: ['custody_type_requested', 'parenting_plan_exists'],
        conditionalRequired: [],
        validations: [],
        gatedBy: 'has_children',
    },
    {
        key: 'asset_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
        gatedBy: 'assets_present',
        isRepeatable: true,
        repeatableRequiredFields: ['asset_type', 'ownership', 'estimated_value', 'title_holder', 'acquired_pre_marriage'],
    },
    {
        key: 'income_support',
        requiredFields: ['client_income_monthly', 'opposing_income_known', 'support_requested'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'debt_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
        gatedBy: 'debts_present',
        isRepeatable: true,
        repeatableRequiredFields: ['debt_type', 'amount', 'responsible_party', 'incurred_during_marriage'],
    },
    {
        key: 'domestic_violence_risk',
        requiredFields: ['dv_present', 'immediate_safety_concerns'],
        conditionalRequired: [
            {
                field: 'protective_order_exists',
                condition: (payload) => payload.dv_present === true,
            },
        ],
        validations: [],
    },
    {
        key: 'jurisdiction_venue',
        requiredFields: ['county_of_filing', 'residency_duration_months'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'prior_legal_actions',
        requiredFields: ['prior_divorce_filings', 'prior_custody_orders', 'existing_attorney'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'desired_outcomes',
        requiredFields: ['primary_goal', 'settlement_preference', 'litigation_tolerance'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'evidence_documents',
        requiredFields: ['documents_reviewed_ack'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'final_review',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
    },
];

// ============================================================================
// UI STEP DEFINITIONS (Sidebar Display)
// ============================================================================

export type UiStepKey =
    | 'basics'
    | 'about_you'
    | 'other_party'
    | 'marriage'
    | 'children_custody'
    | 'assets_finances'
    | 'safety'
    | 'legal'
    | 'goals'
    | 'documents'
    | 'review';

export type UiStepConfig = {
    key: UiStepKey;
    label: string;
    /** Schema steps that must be complete for this UI step to be complete */
    schemaSteps: SchemaStepKey[];
    /** If all schema steps are gated and skipped, should this UI step be hidden? */
    hideWhenAllGated?: boolean;
};

export const UI_STEPS: UiStepConfig[] = [
    {
        key: 'basics',
        label: 'Basics',
        schemaSteps: ['matter_metadata'],
    },
    {
        key: 'about_you',
        label: 'About You',
        schemaSteps: ['client_identity'],
    },
    {
        key: 'other_party',
        label: 'Other Party',
        schemaSteps: ['opposing_party'],
    },
    {
        key: 'marriage',
        label: 'Marriage',
        schemaSteps: ['marriage_details', 'separation_grounds'],
    },
    {
        key: 'children_custody',
        label: 'Children & Custody',
        schemaSteps: ['child_object', 'children_custody'],
        hideWhenAllGated: true,
    },
    {
        key: 'assets_finances',
        label: 'Assets & Finances',
        schemaSteps: ['asset_object', 'income_support', 'debt_object'],
    },
    {
        key: 'safety',
        label: 'Safety',
        schemaSteps: ['domestic_violence_risk'],
    },
    {
        key: 'legal',
        label: 'Legal',
        schemaSteps: ['jurisdiction_venue', 'prior_legal_actions'],
    },
    {
        key: 'goals',
        label: 'Goals',
        schemaSteps: ['desired_outcomes'],
    },
    {
        key: 'documents',
        label: 'Documents',
        schemaSteps: ['evidence_documents'],
    },
    {
        key: 'review',
        label: 'Review',
        schemaSteps: ['final_review'],
    },
];

// Helper to get schema step config by key
export function getSchemaStepConfig(key: SchemaStepKey): SchemaStepConfig | undefined {
    return SCHEMA_STEPS.find((step) => step.key === key);
}

// Helper to get UI step config by key
export function getUiStepConfig(key: UiStepKey): UiStepConfig | undefined {
    return UI_STEPS.find((step) => step.key === key);
}
