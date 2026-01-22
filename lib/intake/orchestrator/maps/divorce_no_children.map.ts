/**
 * Divorce (No Children) Step Map Configuration
 *
 * Mode-locked step map for divorce intake without children.
 * Key features:
 * - Children gate: has_minor_children MUST be false
 * - Assets hard-block: assets_status required
 * - Debts hard-block: debts_status required
 */

import {
    validateZip,
    validateEmail,
    validatePhone,
} from './divorce_custody.map';

import { extractZipFromAddress } from '../../validation';

// ============================================================================
// TYPES
// ============================================================================

export type DivorceNoChildrenSchemaStepKey =
    | 'intake_metadata'
    | 'client_identity'
    | 'opposing_party'
    | 'marriage_details'
    | 'separation_grounds'
    | 'children_gate'
    | 'assets_property'
    | 'asset_object'
    | 'liabilities_debts'
    | 'debt_object'
    | 'income_support'
    | 'safety_risk'
    | 'jurisdiction_venue'
    | 'prior_legal_actions'
    | 'desired_outcomes'
    | 'evidence_documents'
    | 'final_review';

export type DivorceNoChildrenUiStepKey =
    | 'basics'
    | 'client'
    | 'other_party'
    | 'marriage'
    | 'grounds'
    | 'children_gate'
    | 'assets'
    | 'debts'
    | 'income_support'
    | 'safety'
    | 'venue'
    | 'legal_history'
    | 'goals'
    | 'documents'
    | 'review';

type ConditionalRequirement = {
    field: string;
    condition: (payload: Record<string, unknown>) => boolean;
};

type FieldValidation = {
    field: string;
    validator: (value: unknown, payload: Record<string, unknown>) => boolean;
    errorMessage: string;
};

type DivorceNoChildrenSchemaStepConfig = {
    key: DivorceNoChildrenSchemaStepKey;
    requiredFields: string[];
    conditionalRequired: ConditionalRequirement[];
    validations: FieldValidation[];
    /** If set, this step requires specific gating to pass */
    gateCheck?: (payload: Record<string, unknown>) => { pass: boolean; errorMessage?: string };
    isRepeatable?: boolean;
    repeatableRequiredFields?: string[];
    /** If true, step is gated by a status field */
    gatedByStatus?: { field: string; requiredValue: string };
};

type DivorceNoChildrenUiStepConfig = {
    key: DivorceNoChildrenUiStepKey;
    label: string;
    schemaSteps: DivorceNoChildrenSchemaStepKey[];
};

// ============================================================================
// SCHEMA STEPS for Divorce (No Children)
// ============================================================================

export const DIVORCE_NO_CHILDREN_SCHEMA_STEPS: DivorceNoChildrenSchemaStepConfig[] = [
    {
        key: 'intake_metadata',
        requiredFields: ['urgency_level', 'intake_channel'],
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
        requiredFields: ['opposing_first_name', 'opposing_last_name', 'opposing_address_known', 'service_concerns'],
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
                errorMessage: 'Please enter a valid 5-digit ZIP code for spouse address.',
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
        key: 'children_gate',
        requiredFields: ['has_minor_children'],
        conditionalRequired: [],
        validations: [
            {
                field: 'has_minor_children',
                validator: (value) => value === false,
                errorMessage: 'This intake is for divorces without minor children. If you have minor children, please use the appropriate intake.',
            },
        ],
        gateCheck: (payload) => {
            if (payload.has_minor_children === true) {
                return {
                    pass: false,
                    errorMessage: 'This intake is for divorces without minor children. We will route you to the correct intake for matters involving children.',
                };
            }
            return { pass: true };
        },
    },
    {
        key: 'assets_property',
        requiredFields: ['assets_status'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'asset_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
        isRepeatable: true,
        repeatableRequiredFields: ['asset_type', 'ownership', 'estimated_value', 'title_holder', 'acquired_pre_marriage'],
        gatedByStatus: { field: 'assets_status', requiredValue: 'reported' },
    },
    {
        key: 'liabilities_debts',
        requiredFields: ['debts_status'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'debt_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [],
        isRepeatable: true,
        repeatableRequiredFields: ['debt_type', 'amount', 'responsible_party', 'incurred_during_marriage'],
        gatedByStatus: { field: 'debts_status', requiredValue: 'reported' },
    },
    {
        key: 'income_support',
        requiredFields: ['client_income_monthly', 'opposing_income_known', 'support_requested'],
        conditionalRequired: [],
        validations: [],
    },
    {
        key: 'safety_risk',
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
        requiredFields: ['prior_divorce_filings', 'existing_attorney'],
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
// UI STEPS for Divorce (No Children)
// ============================================================================

export const DIVORCE_NO_CHILDREN_UI_STEPS: DivorceNoChildrenUiStepConfig[] = [
    {
        key: 'basics',
        label: 'Basics',
        schemaSteps: ['intake_metadata'],
    },
    {
        key: 'client',
        label: 'About You',
        schemaSteps: ['client_identity'],
    },
    {
        key: 'other_party',
        label: 'Spouse',
        schemaSteps: ['opposing_party'],
    },
    {
        key: 'marriage',
        label: 'Marriage',
        schemaSteps: ['marriage_details'],
    },
    {
        key: 'grounds',
        label: 'Grounds',
        schemaSteps: ['separation_grounds'],
    },
    {
        key: 'children_gate',
        label: 'Children',
        schemaSteps: ['children_gate'],
    },
    {
        key: 'assets',
        label: 'Assets',
        schemaSteps: ['assets_property', 'asset_object'],
    },
    {
        key: 'debts',
        label: 'Debts',
        schemaSteps: ['liabilities_debts', 'debt_object'],
    },
    {
        key: 'income_support',
        label: 'Income & Support',
        schemaSteps: ['income_support'],
    },
    {
        key: 'safety',
        label: 'Safety',
        schemaSteps: ['safety_risk'],
    },
    {
        key: 'venue',
        label: 'Venue',
        schemaSteps: ['jurisdiction_venue'],
    },
    {
        key: 'legal_history',
        label: 'Legal History',
        schemaSteps: ['prior_legal_actions'],
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
export function getDivorceNoChildrenSchemaStepConfig(
    key: DivorceNoChildrenSchemaStepKey
): DivorceNoChildrenSchemaStepConfig | undefined {
    return DIVORCE_NO_CHILDREN_SCHEMA_STEPS.find((step) => step.key === key);
}

// Helper to get UI step config by key
export function getDivorceNoChildrenUiStepConfig(
    key: DivorceNoChildrenUiStepKey
): DivorceNoChildrenUiStepConfig | undefined {
    return DIVORCE_NO_CHILDREN_UI_STEPS.find((step) => step.key === key);
}
