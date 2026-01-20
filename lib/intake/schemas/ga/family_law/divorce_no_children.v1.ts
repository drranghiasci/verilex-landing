/**
 * Georgia Divorce (No Children) Schema v1.0
 *
 * MODE-LOCKED: This schema excludes all custody/children sections beyond the gating question.
 * For married couples divorcing who do NOT have minor children.
 *
 * Key differences from divorce+custody:
 * - has_minor_children MUST be false (gated)
 * - No custody, parenting plan, child support sections
 * - Assets and debts are REQUIRED coverage (hard-block)
 */

import type { SchemaDef } from '../../types';

export const GA_DIVORCE_NO_CHILDREN_V1: SchemaDef = {
    version: 'v1.0',
    sections: [
        // =========================================================================
        // 1. INTAKE METADATA
        // =========================================================================
        {
            id: 'intake_metadata',
            title: 'INTAKE METADATA',
            fields: [
                {
                    key: 'intake_type',
                    type: 'text',
                    required: true,
                    isSystem: true,
                    notes: 'System: divorce_no_children',
                },
                {
                    key: 'practice_area',
                    type: 'text',
                    required: true,
                    isSystem: true,
                    notes: 'System: family_law',
                },
                {
                    key: 'jurisdiction_state',
                    type: 'text',
                    required: true,
                    isSystem: true,
                    notes: 'System: GA',
                },
                {
                    key: 'urgency_level',
                    type: 'enum',
                    required: true,
                    enumValues: ['routine', 'urgent', 'emergency'],
                },
                {
                    key: 'intake_channel',
                    type: 'enum',
                    required: true,
                    enumValues: ['web', 'referral', 'phone'],
                },
                {
                    key: 'date_of_intake',
                    type: 'date',
                    required: true,
                    isSystem: true,
                    notes: 'System generated',
                },
            ],
        },

        // =========================================================================
        // 2. CLIENT IDENTITY
        // =========================================================================
        {
            id: 'client_identity',
            title: 'CLIENT IDENTITY',
            fields: [
                { key: 'client_first_name', type: 'text', required: true },
                { key: 'client_last_name', type: 'text', required: true },
                { key: 'client_dob', type: 'date', required: true },
                { key: 'client_phone', type: 'text', required: true, notes: 'Validated: basic phone format' },
                { key: 'client_email', type: 'text', required: true, notes: 'Validated: basic email format' },
                {
                    key: 'client_address',
                    type: 'structured',
                    required: true,
                    notes: 'Structured: street, city, state, zip (ZIP validated)',
                },
                {
                    key: 'client_county',
                    type: 'enum',
                    required: true,
                    notes: 'GA county enum',
                },
                {
                    key: 'citizenship_status',
                    type: 'enum',
                    required: false,
                    enumValues: [
                        'us_citizen',
                        'lawful_permanent_resident',
                        'nonimmigrant_visa_holder',
                        'undocumented',
                        'dual_citizen',
                        'unknown',
                        'prefer_not_to_say',
                    ],
                },
                { key: 'military_status', type: 'boolean', required: false },
            ],
        },

        // =========================================================================
        // 3. OPPOSING PARTY (SPOUSE)
        // =========================================================================
        {
            id: 'opposing_party',
            title: 'OPPOSING PARTY (SPOUSE)',
            fields: [
                { key: 'opposing_first_name', type: 'text', required: true },
                { key: 'opposing_last_name', type: 'text', required: true },
                { key: 'opposing_name', type: 'text', required: false, notes: 'Computed: first + last' },
                { key: 'opposing_address_known', type: 'boolean', required: true },
                {
                    key: 'opposing_last_known_address',
                    type: 'structured',
                    required: false,
                    notes: 'Required if opposing_address_known=true; ZIP validated',
                },
                { key: 'service_concerns', type: 'boolean', required: true, notes: 'Any concerns about serving papers?' },
                {
                    key: 'opposing_employment_status',
                    type: 'enum',
                    required: false,
                    enumValues: [
                        'employed_full_time',
                        'employed_part_time',
                        'self_employed',
                        'unemployed',
                        'student',
                        'retired',
                        'disabled',
                        'unknown',
                    ],
                },
            ],
        },

        // =========================================================================
        // 4. MARRIAGE DETAILS
        // =========================================================================
        {
            id: 'marriage_details',
            title: 'MARRIAGE DETAILS',
            fields: [
                { key: 'date_of_marriage', type: 'date', required: true },
                { key: 'place_of_marriage', type: 'text', required: true },
                { key: 'currently_cohabitating', type: 'boolean', required: true },
                {
                    key: 'date_of_separation',
                    type: 'date',
                    required: false,
                    notes: 'Required if currently_cohabitating=false',
                },
                { key: 'marriage_certificate_available', type: 'boolean', required: false },
            ],
        },

        // =========================================================================
        // 5. SEPARATION & GROUNDS (GEORGIA)
        // =========================================================================
        {
            id: 'separation_grounds',
            title: 'SEPARATION & GROUNDS',
            fields: [
                {
                    key: 'grounds_for_divorce',
                    type: 'enum',
                    required: true,
                    enumValues: [
                        'irretrievable_breakdown',
                        'irreconcilable_differences',
                        'marriage_void_ab_initio',
                        'adultery',
                        'desertion',
                        'conviction_of_crime',
                        'cruel_treatment',
                        'habitual_intoxication',
                        'mental_incapacity',
                    ],
                },
                {
                    key: 'fault_allegations',
                    type: 'multiselect',
                    required: false,
                    enumValues: [
                        'adultery',
                        'desertion',
                        'cruel_treatment',
                        'habitual_intoxication',
                        'drug_addiction',
                        'conviction_imprisonment',
                        'mental_incapacity',
                    ],
                },
                { key: 'reconciliation_attempted', type: 'boolean', required: false },
            ],
        },

        // =========================================================================
        // 6. CHILDREN GATE (MUST BE FALSE FOR THIS INTAKE)
        // =========================================================================
        {
            id: 'children_gate',
            title: 'CHILDREN CONFIRMATION',
            fields: [
                {
                    key: 'has_minor_children',
                    type: 'boolean',
                    required: true,
                    notes: 'GATE: Must be false for divorce_no_children intake. If true, route to different intake.',
                },
            ],
        },

        // =========================================================================
        // 7. ASSETS & PROPERTY (REQUIRED COVERAGE)
        // =========================================================================
        {
            id: 'assets_property',
            title: 'ASSETS & PROPERTY',
            fields: [
                {
                    key: 'assets_status',
                    type: 'enum',
                    required: true,
                    enumValues: ['reported', 'none_reported', 'deferred_to_attorney'],
                    notes: 'HARD-BLOCK: Must set coverage status before proceeding',
                },
            ],
        },
        // Asset objects (repeatable, required if assets_status='reported')
        {
            id: 'asset_object',
            title: 'ASSET DETAILS',
            fields: [
                {
                    key: 'asset_type',
                    type: 'enum',
                    required: true,
                    enumValues: [
                        'real_estate',
                        'bank_account',
                        'retirement',
                        'vehicle',
                        'business',
                        'personal_property',
                        'investment',
                        'other',
                    ],
                },
                {
                    key: 'ownership',
                    type: 'enum',
                    required: true,
                    enumValues: ['client', 'spouse', 'joint', 'unknown'],
                },
                { key: 'estimated_value', type: 'number', required: true },
                {
                    key: 'title_holder',
                    type: 'enum',
                    required: true,
                    enumValues: ['client', 'spouse', 'joint', 'other', 'unknown'],
                },
                { key: 'acquired_pre_marriage', type: 'boolean', required: true },
                { key: 'asset_description', type: 'text', required: false },
            ],
        },

        // =========================================================================
        // 8. LIABILITIES & DEBTS (REQUIRED COVERAGE)
        // =========================================================================
        {
            id: 'liabilities_debts',
            title: 'LIABILITIES & DEBTS',
            fields: [
                {
                    key: 'debts_status',
                    type: 'enum',
                    required: true,
                    enumValues: ['reported', 'none_reported', 'deferred_to_attorney'],
                    notes: 'HARD-BLOCK: Must set coverage status before proceeding',
                },
            ],
        },
        // Debt objects (repeatable, required if debts_status='reported')
        {
            id: 'debt_object',
            title: 'DEBT DETAILS',
            fields: [
                {
                    key: 'debt_type',
                    type: 'enum',
                    required: true,
                    enumValues: [
                        'mortgage',
                        'car_loan',
                        'credit_card',
                        'student_loan',
                        'personal_loan',
                        'medical_debt',
                        'tax_debt',
                        'other',
                    ],
                },
                { key: 'amount', type: 'number', required: true },
                {
                    key: 'responsible_party',
                    type: 'enum',
                    required: true,
                    enumValues: ['client', 'spouse', 'joint', 'unknown'],
                },
                { key: 'incurred_during_marriage', type: 'boolean', required: true },
                { key: 'creditor_name', type: 'text', required: false },
            ],
        },

        // =========================================================================
        // 9. INCOME & SUPPORT (DIVORCE-FOCUSED, NO CHILD SUPPORT)
        // =========================================================================
        {
            id: 'income_support',
            title: 'INCOME & SUPPORT',
            fields: [
                { key: 'client_income_monthly', type: 'number', required: true },
                { key: 'opposing_income_known', type: 'boolean', required: true },
                {
                    key: 'opposing_income_monthly_estimate',
                    type: 'number',
                    required: false,
                    notes: 'Optional: if opposing_income_known=true',
                },
                { key: 'alimony_requested', type: 'boolean', required: false },
                {
                    key: 'support_requested',
                    type: 'enum',
                    required: true,
                    enumValues: ['none', 'alimony_only', 'unsure'],
                    notes: 'No child support options for this intake',
                },
            ],
        },

        // =========================================================================
        // 10. SAFETY & RISK
        // =========================================================================
        {
            id: 'safety_risk',
            title: 'SAFETY & RISK',
            fields: [
                { key: 'dv_present', type: 'boolean', required: true },
                { key: 'immediate_safety_concerns', type: 'boolean', required: true },
                {
                    key: 'protective_order_exists',
                    type: 'boolean',
                    required: false,
                    notes: 'Required if dv_present=true',
                },
            ],
        },

        // =========================================================================
        // 11. JURISDICTION & VENUE
        // =========================================================================
        {
            id: 'jurisdiction_venue',
            title: 'JURISDICTION & VENUE',
            fields: [
                {
                    key: 'county_of_filing',
                    type: 'enum',
                    required: true,
                    notes: 'GA county where case will be filed',
                },
                {
                    key: 'residency_duration_months',
                    type: 'number',
                    required: true,
                    notes: 'How long client has lived in GA (6 months required)',
                },
                {
                    key: 'venue_confirmed',
                    type: 'boolean',
                    required: false,
                    isSystem: true,
                    notes: 'System: venue validation result',
                },
            ],
        },

        // =========================================================================
        // 12. PRIOR LEGAL ACTIONS
        // =========================================================================
        {
            id: 'prior_legal_actions',
            title: 'PRIOR LEGAL ACTIONS',
            fields: [
                { key: 'prior_divorce_filings', type: 'boolean', required: true },
                { key: 'case_numbers', type: 'text', required: false },
                { key: 'existing_attorney', type: 'boolean', required: true },
            ],
        },

        // =========================================================================
        // 13. DESIRED OUTCOMES
        // =========================================================================
        {
            id: 'desired_outcomes',
            title: 'DESIRED OUTCOMES',
            fields: [
                {
                    key: 'primary_goal',
                    type: 'enum',
                    required: true,
                    enumValues: [
                        'quick_resolution',
                        'fair_asset_division',
                        'alimony',
                        'protect_assets',
                        'other',
                    ],
                },
                {
                    key: 'settlement_preference',
                    type: 'enum',
                    required: true,
                    enumValues: ['negotiation', 'mediation', 'litigation', 'unsure'],
                },
                {
                    key: 'litigation_tolerance',
                    type: 'enum',
                    required: true,
                    enumValues: ['low', 'medium', 'high'],
                },
                { key: 'non_negotiables', type: 'text', required: false },
            ],
        },

        // =========================================================================
        // 14. EVIDENCE & DOCUMENTS
        // =========================================================================
        {
            id: 'evidence_documents',
            title: 'EVIDENCE & DOCUMENTS',
            fields: [
                {
                    key: 'documents_reviewed_ack',
                    type: 'boolean',
                    required: true,
                    notes: 'Client acknowledges document step complete',
                },
                {
                    key: 'document_type',
                    type: 'enum',
                    required: false,
                    enumValues: [
                        'marriage_certificate',
                        'financial_statement',
                        'property_deed',
                        'vehicle_title',
                        'retirement_statement',
                        'bank_statement',
                        'tax_return',
                        'pay_stub',
                        'prenuptial_agreement',
                        'other',
                    ],
                },
                { key: 'uploaded', type: 'boolean', required: false },
                {
                    key: 'missing_required_docs',
                    type: 'list',
                    required: false,
                    isSystem: true,
                    notes: 'System: list of missing required documents',
                },
            ],
        },

        // =========================================================================
        // 15. FINAL REVIEW
        // =========================================================================
        {
            id: 'final_review',
            title: 'FINAL REVIEW',
            fields: [
                {
                    key: 'questions_for_firm',
                    type: 'text',
                    required: false,
                    notes: 'Any questions for the firm before submission',
                },
            ],
        },
    ],
};

// System flags (attorney-only, computed)
export const GA_DIVORCE_NO_CHILDREN_V1_FLAGS = [
    { key: 'jurisdiction_risk', trigger: 'residency_duration_months < 6' },
    { key: 'financial_complexity', trigger: 'business asset detected or high values' },
    { key: 'safety_escalation', trigger: 'dv_present or immediate_safety_concerns' },
    { key: 'contradiction_detected', trigger: 'Conflicting assertions detected' },
];
