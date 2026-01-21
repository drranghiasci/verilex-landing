/**
 * Georgia Custody (Unmarried / No Divorce) Schema v1.0
 *
 * MODE-LOCKED: This schema explicitly excludes all divorce/marriage fields.
 * This is for clients who were never married and need to establish custody.
 */

import type { SchemaDef } from '../../types';

export const GA_CUSTODY_UNMARRIED_V1: SchemaDef = {
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
                    notes: 'System: custody_unmarried',
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
                    enumValues: ['standard', 'urgent', 'emergency'],
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
        // 3. OTHER PARENT
        // =========================================================================
        {
            id: 'other_parent',
            title: 'OTHER PARENT',
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
        // 4. CHILDREN (Required for custody intake)
        // =========================================================================
        {
            id: 'children_info',
            title: 'CHILDREN INFORMATION',
            fields: [
                {
                    key: 'has_children',
                    type: 'boolean',
                    required: true,
                    notes: 'Must be true for custody intake; ask to confirm',
                },
                {
                    key: 'children_count',
                    type: 'number',
                    required: true,
                    notes: 'Must be >= 1',
                },
            ],
        },

        // Child object (repeatable)
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
            ],
        },

        // =========================================================================
        // 5. CUSTODY PREFERENCES
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
                // UCCJEA-relevant fields (jurisdiction)
                {
                    key: 'child_home_state',
                    type: 'enum',
                    required: true,
                    notes: 'State where child has lived for past 6 months',
                    enumValues: [
                        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
                        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
                        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
                        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
                        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
                    ],
                },
                { key: 'child_home_county', type: 'text', required: true },
                {
                    key: 'time_in_home_state_months',
                    type: 'number',
                    required: true,
                    notes: 'How long child has lived in home state',
                },
            ],
        },

        // =========================================================================
        // 6. SAFETY & RISK
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
        // 7. JURISDICTION & VENUE
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
                    notes: 'How long client has lived in GA',
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
        // 8. PRIOR LEGAL ACTIONS
        // =========================================================================
        {
            id: 'prior_legal_actions',
            title: 'PRIOR LEGAL ACTIONS',
            fields: [
                { key: 'prior_custody_orders', type: 'boolean', required: true },
                {
                    key: 'prior_divorce_filings',
                    type: 'boolean',
                    required: true,
                    notes: 'Custody cases can involve prior divorce; still ask',
                },
                { key: 'case_numbers', type: 'text', required: false },
                { key: 'existing_attorney', type: 'boolean', required: true },
            ],
        },

        // =========================================================================
        // 9. DESIRED OUTCOMES
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
                        'sole_custody',
                        'parenting_time',
                        'establish_order',
                        'emergency_order',
                        'legitimation',
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
        // 10. EVIDENCE & DOCUMENTS
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
                        'birth_certificate',
                        'custody_order',
                        'paternity_test',
                        'school_record',
                        'medical_record',
                        'text_message',
                        'email',
                        'photo',
                        'video',
                        'police_report',
                        'protective_order',
                        'other',
                    ],
                },
                { key: 'uploaded', type: 'boolean', required: false },
            ],
        },

        // =========================================================================
        // 11. FINAL REVIEW
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
export const GA_CUSTODY_UNMARRIED_V1_FLAGS = [
    { key: 'uccjea_risk', trigger: 'child_home_state != GA or time_in_home_state_months < 6' },
    { key: 'interstate_party', trigger: 'opposing address state != GA' },
    { key: 'safety_escalation', trigger: 'dv_present or immediate_safety_concerns' },
    { key: 'contradiction_detected', trigger: 'Conflicting assertions detected' },
];
