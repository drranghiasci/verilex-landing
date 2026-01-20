/**
 * Georgia Divorce + Custody (Married Parents) Schema v1.0
 *
 * FULL-STACK FAMILY LAW INTAKE: Divorce + Children/Custody + Support + Assets/Debts
 * 
 * This is the complete combined intake for married parents divorcing with minor children.
 * - Marriage and grounds are REQUIRED
 * - Children/custody are REQUIRED (has_minor_children MUST be true)
 * - Assets/debts are REQUIRED coverage (hard-block)
 */

import type { SchemaDef } from '../../types';

export const GA_DIVORCE_WITH_CHILDREN_V1: SchemaDef = {
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
                    notes: 'System: divorce_with_children',
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
        // 6. CHILDREN GATE (MUST BE TRUE FOR THIS INTAKE)
        // =========================================================================
        {
            id: 'children_gate',
            title: 'CHILDREN CONFIRMATION',
            fields: [
                {
                    key: 'has_minor_children',
                    type: 'boolean',
                    required: true,
                    notes: 'GATE: Must be true for divorce_with_children intake. If false, route to divorce_no_children.',
                },
                {
                    key: 'children_count',
                    type: 'number',
                    required: true,
                    notes: 'Must be >= 1',
                },
            ],
        },

        // =========================================================================
        // 7. CHILDREN DETAILS (REPEATABLE)
        // =========================================================================
        {
            id: 'child_object',
            title: 'CHILD DETAILS',
            fields: [
                { key: 'child_full_name', type: 'text', required: true },
                { key: 'child_dob', type: 'date', required: true },
                {
                    key: 'child_current_residence',
                    type: 'enum',
                    required: true,
                    enumValues: ['with_client', 'with_other_parent', 'split', 'third_party', 'other'],
                },
                {
                    key: 'biological_relation',
                    type: 'enum',
                    required: true,
                    enumValues: ['biological', 'adoptive', 'step', 'other'],
                },
                { key: 'special_needs', type: 'boolean', required: false },
                { key: 'school_district', type: 'text', required: false },
                {
                    key: 'child_home_state',
                    type: 'enum',
                    required: true,
                    notes: 'State where child has lived for past 6 months (UCCJEA)',
                    enumValues: [
                        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
                    ],
                },
                {
                    key: 'time_in_home_state_months',
                    type: 'number',
                    required: true,
                    notes: 'How long child has lived in home state',
                },
            ],
        },

        // =========================================================================
        // 8. CUSTODY PREFERENCES
        // =========================================================================
        {
            id: 'custody_preferences',
            title: 'CUSTODY PREFERENCES',
            fields: [
                { key: 'existing_order', type: 'boolean', required: true, notes: 'Is there an existing custody order?' },
                { key: 'seeking_modification', type: 'boolean', required: true, notes: 'Seeking to modify existing order?' },
                {
                    key: 'custody_type_requested',
                    type: 'enum',
                    required: true,
                    enumValues: ['sole', 'joint', 'primary', 'unsure'],
                },
                { key: 'parenting_plan_exists', type: 'boolean', required: true },
                {
                    key: 'current_parenting_schedule',
                    type: 'text',
                    required: false,
                    notes: 'Optional: describe current schedule if one exists',
                },
            ],
        },

        // =========================================================================
        // 9. ASSETS & PROPERTY (REQUIRED COVERAGE)
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
        // 10. LIABILITIES & DEBTS (REQUIRED COVERAGE)
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
        // 11. INCOME & SUPPORT (WITH CHILD SUPPORT)
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
                    enumValues: ['none', 'child_support_only', 'alimony_only', 'both', 'unsure'],
                    notes: 'Includes child support options for this intake',
                },
                {
                    key: 'child_support_estimate',
                    type: 'number',
                    required: false,
                    isSystem: true,
                    notes: 'System: computed later; does not block submission',
                },
            ],
        },

        // =========================================================================
        // 12. SAFETY & RISK
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
                { key: 'children_exposed', type: 'boolean', required: false },
            ],
        },

        // =========================================================================
        // 13. JURISDICTION & VENUE
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
        // 14. PRIOR LEGAL ACTIONS
        // =========================================================================
        {
            id: 'prior_legal_actions',
            title: 'PRIOR LEGAL ACTIONS',
            fields: [
                { key: 'prior_divorce_filings', type: 'boolean', required: true },
                { key: 'prior_custody_orders', type: 'boolean', required: true },
                { key: 'case_numbers', type: 'text', required: false },
                { key: 'existing_attorney', type: 'boolean', required: true },
            ],
        },

        // =========================================================================
        // 15. DESIRED OUTCOMES
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
                        'fair_custody',
                        'primary_custody',
                        'fair_asset_division',
                        'child_support',
                        'alimony',
                        'protect_children',
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
        // 16. EVIDENCE & DOCUMENTS
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
                        'birth_certificate',
                        'custody_order',
                        'financial_statement',
                        'property_deed',
                        'vehicle_title',
                        'retirement_statement',
                        'bank_statement',
                        'tax_return',
                        'pay_stub',
                        'prenuptial_agreement',
                        'protective_order',
                        'school_record',
                        'medical_record',
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
        // 17. FINAL REVIEW
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
export const GA_DIVORCE_WITH_CHILDREN_V1_FLAGS = [
    { key: 'uccjea_risk', trigger: 'child_home_state != GA or time_in_home_state_months < 6' },
    { key: 'interstate_party', trigger: 'opposing address state != GA' },
    { key: 'safety_escalation', trigger: 'dv_present or immediate_safety_concerns' },
    { key: 'financial_complexity', trigger: 'business asset detected or high values' },
    { key: 'contradiction_detected', trigger: 'Conflicting assertions detected' },
];
