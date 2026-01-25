/**
 * Divorce + Custody (Married Parents) Step Map Configuration
 *
 * Full-stack family law intake: divorce + children/custody + support + assets/debts.
 * Key features:
 * - Children gate: has_minor_children MUST be true
 * - Children loop: requires exactly N child objects
 * - Assets/debts hard-block: requires status
 * - Marriage/grounds required
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

export type DivorceWithChildrenSchemaStepKey =
    | 'intake_metadata'
    | 'client_identity'
    | 'opposing_party'
    | 'marriage_details'
    | 'separation_grounds'
    | 'children_gate'
    | 'child_object'
    | 'custody_preferences'
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

export type DivorceWithChildrenUiStepKey =
    | 'basics'
    | 'client'
    | 'other_party'
    | 'marriage'
    | 'grounds'
    | 'children_gate'
    | 'children_details'
    | 'custody'
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

type DivorceWithChildrenSchemaStepConfig = {
    key: DivorceWithChildrenSchemaStepKey;
    requiredFields: string[];
    conditionalRequired: ConditionalRequirement[];
    validations: FieldValidation[];
    gateCheck?: (payload: Record<string, unknown>) => { pass: boolean; errorMessage?: string };
    isRepeatable?: boolean;
    repeatableRequiredFields?: string[];
    repeatableCountField?: string;
    gatedByStatus?: { field: string; requiredValue: string };
};

type DivorceWithChildrenUiStepConfig = {
    key: DivorceWithChildrenUiStepKey;
    label: string;
    schemaSteps: DivorceWithChildrenSchemaStepKey[];
};

// ============================================================================
// SCHEMA STEPS
// ============================================================================

function toArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
}

export const DIVORCE_WITH_CHILDREN_SCHEMA_STEPS: DivorceWithChildrenSchemaStepConfig[] = [
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
        requiredFields: ['has_minor_children', 'children_count'],
        conditionalRequired: [],
        validations: [
            {
                field: 'has_minor_children',
                validator: (value) => value === true,
                errorMessage: 'This intake is for divorces with minor children. If no children, use divorce_no_children intake.',
            },
            {
                field: 'children_count',
                validator: (value) => typeof value === 'number' && value >= 1,
                errorMessage: 'Please enter at least 1 child.',
            },
        ],
        gateCheck: (payload) => {
            if (payload.has_minor_children === false) {
                return {
                    pass: false,
                    errorMessage: 'This intake is for divorces with minor children. We will route you to the correct intake.',
                };
            }
            return { pass: true };
        },
    },
    {
        key: 'child_object',
        // Require children_count so this step won't be complete until children_gate passes
        requiredFields: ['children_count'],
        conditionalRequired: [],
        validations: [
            {
                field: 'children_count',
                validator: (value) => typeof value === 'number' && value >= 1,
                errorMessage: 'At least one child must be specified.',
            },
        ],
        isRepeatable: true,
        repeatableCountField: 'children_count',
        repeatableRequiredFields: [
            'child_full_name',
            'child_dob',
            'child_current_residence',
            'biological_relation',
            'child_home_state',
            'time_in_home_state_months',
        ],
    },
    {
        key: 'custody_preferences',
        requiredFields: [
            'existing_order',
            'seeking_modification',
            'custody_type_requested',
            'parenting_plan_exists',
        ],
        conditionalRequired: [],
        validations: [],
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
// UI STEPS
// ============================================================================

export const DIVORCE_WITH_CHILDREN_UI_STEPS: DivorceWithChildrenUiStepConfig[] = [
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
        key: 'children_details',
        label: 'Child Details',
        schemaSteps: ['child_object'],
    },
    {
        key: 'custody',
        label: 'Custody',
        schemaSteps: ['custody_preferences'],
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
export function getDivorceWithChildrenSchemaStepConfig(
    key: DivorceWithChildrenSchemaStepKey
): DivorceWithChildrenSchemaStepConfig | undefined {
    return DIVORCE_WITH_CHILDREN_SCHEMA_STEPS.find((step) => step.key === key);
}

// Helper to get UI step config by key
export function getDivorceWithChildrenUiStepConfig(
    key: DivorceWithChildrenUiStepKey
): DivorceWithChildrenUiStepConfig | undefined {
    return DIVORCE_WITH_CHILDREN_UI_STEPS.find((step) => step.key === key);
}
