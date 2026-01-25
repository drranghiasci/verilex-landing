/**
 * Custody (Unmarried) Step Map Configuration
 *
 * Mode-locked step map for custody intake (no divorce/marriage questions).
 * 11 steps matching the gaCustodyUnmarriedV1 schema.
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

export type CustodySchemaStepKey =
    | 'intake_metadata'
    | 'client_identity'
    | 'other_parent'
    | 'children_info'
    | 'child_object'
    | 'custody_preferences'
    | 'safety_risk'
    | 'jurisdiction_venue'
    | 'prior_legal_actions'
    | 'desired_outcomes'
    | 'evidence_documents'
    | 'final_review';

export type CustodyUiStepKey =
    | 'basics'
    | 'client'
    | 'other_parent'
    | 'children'
    | 'custody'
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

type CustodySchemaStepConfig = {
    key: CustodySchemaStepKey;
    requiredFields: string[];
    conditionalRequired: ConditionalRequirement[];
    validations: FieldValidation[];
    isRepeatable?: boolean;
    repeatableRequiredFields?: string[];
};

type CustodyUiStepConfig = {
    key: CustodyUiStepKey;
    label: string;
    schemaSteps: CustodySchemaStepKey[];
};

// ============================================================================
// SCHEMA STEPS for Custody (Unmarried)
// ============================================================================

export const CUSTODY_SCHEMA_STEPS: CustodySchemaStepConfig[] = [
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
                    if (!value) return false;
                    const zip = extractZipFromAddress(value);
                    if (zip === undefined) return true;
                    return validateZip(zip);
                },
                errorMessage: 'If including a ZIP code, please ensure it is a valid 5-digit format.',
            },
        ],
    },
    {
        key: 'other_parent',
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
                errorMessage: 'Please enter a valid 5-digit ZIP code for other parent address.',
            },
        ],
    },
    {
        key: 'children_info',
        requiredFields: ['has_children', 'children_count'],
        conditionalRequired: [],
        validations: [
            {
                field: 'has_children',
                validator: (value) => value === true,
                errorMessage: 'This intake requires children. If no children, use a different intake type.',
            },
            {
                field: 'children_count',
                validator: (value) => typeof value === 'number' && value >= 1,
                errorMessage: 'Please enter at least 1 child.',
            },
        ],
    },
    {
        key: 'child_object',
        requiredFields: [],
        conditionalRequired: [],
        validations: [
            {
                field: 'child_full_name',
                validator: (value, payload) => {
                    const count = payload.children_count as number || 0;
                    if (count === 0) return true;
                    const names = Array.isArray(payload.child_full_name) ? payload.child_full_name : [];
                    return names.length >= count && names.every((n) => typeof n === 'string' && n.trim().length > 0);
                },
                errorMessage: 'Please provide names for all children.',
            },
        ],
        isRepeatable: true,
        repeatableRequiredFields: ['child_full_name', 'child_dob', 'child_current_residence', 'biological_relation'],
    },
    {
        key: 'custody_preferences',
        requiredFields: [
            'existing_order',
            'seeking_modification',
            'custody_type_requested',
            'parenting_plan_exists',
            'child_home_state',
            'child_home_county',
            'time_in_home_state_months',
        ],
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
        requiredFields: ['prior_custody_orders', 'prior_divorce_filings', 'existing_attorney'],
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
// UI STEPS for Custody (Unmarried)
// ============================================================================

export const CUSTODY_UI_STEPS: CustodyUiStepConfig[] = [
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
        key: 'other_parent',
        label: 'Other Parent',
        schemaSteps: ['other_parent'],
    },
    {
        key: 'children',
        label: 'Children',
        schemaSteps: ['children_info', 'child_object'],
    },
    {
        key: 'custody',
        label: 'Custody',
        schemaSteps: ['custody_preferences'],
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
export function getCustodySchemaStepConfig(key: CustodySchemaStepKey): CustodySchemaStepConfig | undefined {
    return CUSTODY_SCHEMA_STEPS.find((step) => step.key === key);
}

// Helper to get UI step config by key
export function getCustodyUiStepConfig(key: CustodyUiStepKey): CustodyUiStepConfig | undefined {
    return CUSTODY_UI_STEPS.find((step) => step.key === key);
}
