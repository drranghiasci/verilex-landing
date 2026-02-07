/**
 * Prompt Copy Map — Centralized field→natural-language question mapping
 *
 * Every schema field that could appear in missingFields MUST have an entry here.
 * If a field is missing from this map, getFieldQuestion() will throw in dev and
 * fall back to a sanitized question in production.
 *
 * This file also exports a sanitizer that strips schema keys from AI output.
 */

// ============================================================================
// FIELD → QUESTION MAP
// ============================================================================

const FIELD_QUESTION_MAP: Record<string, string> = {
    // ── Intake Metadata ──────────────────────────────────────────────────────
    urgency_level:
        'How urgently do you need help with this matter?',
    referral_source:
        'How did you hear about the firm? (Google/search, friend/family, referral, social media, or other)',

    // ── Client Identity ──────────────────────────────────────────────────────
    client_first_name: 'What is your first name?',
    client_last_name: 'What is your last name?',
    client_dob: 'What is your date of birth?',
    client_phone: 'What is the best phone number to reach you?',
    client_email: 'What is your email address?',
    client_address:
        'What is your current address? (please include city, state, and ZIP)',
    client_county: 'What Georgia county do you live in?',

    // ── Opposing Party / Other Parent ────────────────────────────────────────
    opposing_first_name: "What is the other party's first name?",
    opposing_last_name: "What is the other party's last name?",
    opposing_address_same_as_client:
        'Does the other party live at the same address as you?',
    opposing_address_known:
        "Do you know the other party's current address?",
    opposing_last_known_address:
        "What is the other party's current or last known address?",
    service_concerns:
        'Do you have any concerns about being able to serve the other party with legal papers?',

    // ── Marriage Details ─────────────────────────────────────────────────────
    date_of_marriage: 'What was the date of your marriage?',
    place_of_marriage: 'Where were you married? (city and state)',
    currently_cohabitating:
        'Are you and your spouse currently living together?',
    date_of_separation:
        'When did you and your spouse separate?',

    // ── Separation & Grounds ─────────────────────────────────────────────────
    grounds_for_divorce:
        'What are the grounds for divorce? (e.g., irreconcilable differences, irretrievably broken)',
    reconciliation_attempted:
        'Have you and your spouse attempted reconciliation or counseling?',

    // ── Children ─────────────────────────────────────────────────────────────
    has_minor_children: 'Do you have any minor children (under 18)?',
    has_children: 'Do you have children with the other parent?',
    children_count: 'How many children are involved in this matter?',
    child_full_name: "What is the child's full name?",
    child_dob: "What is the child's date of birth?",
    child_current_residence: 'Who does the child currently live with?',
    biological_relation:
        'What is your relationship to this child? (biological parent, step-parent, etc.)',
    child_home_state:
        'What state has this child lived in for the past 6 months?',
    child_home_county:
        'What county has this child lived in?',
    time_in_home_state_months:
        "How long has this child lived in that state? (years and months is fine)",

    // ── Custody Preferences ──────────────────────────────────────────────────
    existing_order:
        'Is there an existing custody or visitation order in place?',
    seeking_modification:
        'Are you seeking to modify an existing order?',
    custody_type_requested:
        'What type of custody arrangement are you seeking? (sole, joint, etc.)',
    parenting_plan_exists:
        'Is there a current parenting plan in place?',

    // ── Assets & Property ────────────────────────────────────────────────────
    assets_status:
        'Do you and your spouse have shared marital assets or property to divide?',
    asset_type: 'What type of asset is this? (real estate, vehicle, bank account, etc.)',
    ownership: 'Who currently owns or holds this asset?',
    estimated_value: 'What is the estimated value of this asset?',
    title_holder: 'Whose name is on the title or account?',
    acquired_pre_marriage:
        'Was this asset acquired before the marriage?',

    // ── Debts & Liabilities ──────────────────────────────────────────────────
    debts_status:
        'Do you and your spouse have shared debts or liabilities?',
    debt_type: 'What type of debt is this? (mortgage, credit card, student loan, etc.)',
    amount: 'What is the approximate amount of this debt?',
    debt_amount: 'What is the approximate amount of this debt?',
    responsible_party: 'Who is responsible for this debt?',
    incurred_during_marriage: 'Was this debt incurred during the marriage?',

    // ── Income & Support ─────────────────────────────────────────────────────
    client_income_monthly:
        'What is your approximate monthly income?',
    opposing_income_known:
        "Do you know the other party's approximate income?",
    support_requested:
        'Are you requesting spousal support or child support?',

    // ── Safety & Risk ────────────────────────────────────────────────────────
    dv_present:
        'Has there been any domestic violence or abuse in this relationship?',
    immediate_safety_concerns:
        'Do you have any immediate safety concerns?',
    protective_order_exists:
        'Is there currently a protective order in place?',

    // ── Jurisdiction & Venue ─────────────────────────────────────────────────
    county_of_filing:
        'In which Georgia county do you plan to file?',
    residency_duration_months:
        'How long have you lived in Georgia? (years and months is fine)',

    // ── Prior Legal Actions ──────────────────────────────────────────────────
    prior_divorce_filings:
        'Have any divorce petitions been filed previously?',
    prior_custody_orders:
        'Are there any prior custody orders related to these children?',
    existing_attorney:
        'Do you currently have an attorney for this matter?',

    // ── Desired Outcomes ─────────────────────────────────────────────────────
    primary_goal:
        'What is your primary goal in this matter?',
    settlement_preference:
        'Would you prefer to settle out of court, or are you prepared for litigation?',
    litigation_tolerance:
        'How comfortable are you with the possibility of going to court?',

    // ── Evidence & Documents ─────────────────────────────────────────────────
    documents_reviewed_ack:
        'Have you reviewed the list of documents that may be needed for your case?',
};

// ============================================================================
// SCHEMA KEY BLOCKLIST (all keys that must never appear in user-facing text)
// ============================================================================

export const SCHEMA_KEY_BLOCKLIST: string[] = [
    // Step keys (internal orchestrator names)
    'intake_metadata', 'client_identity', 'opposing_party', 'other_parent',
    'marriage_details', 'separation_grounds', 'children_gate', 'child_object',
    'custody_preferences', 'assets_property', 'asset_object', 'liabilities_debts',
    'debt_object', 'income_support', 'safety_risk', 'jurisdiction_venue',
    'prior_legal_actions', 'desired_outcomes', 'evidence_documents', 'final_review',
    'children_info',
    // Field keys that look robotic if shown
    'biological_relation', 'child_home_state', 'time_in_home_state_months',
    'opposing_address_same_as_client', 'opposing_address_known',
    'opposing_last_known_address', 'client_county', 'client_dob',
    'client_first_name', 'client_last_name', 'client_phone', 'client_email',
    'client_address', 'urgency_level', 'referral_source', 'intake_channel',
    'date_of_intake', 'schema_version',
    'currently_cohabitating', 'date_of_separation', 'grounds_for_divorce',
    'reconciliation_attempted', 'has_minor_children', 'children_count',
    'child_full_name', 'child_dob', 'child_current_residence',
    'custody_type_requested', 'parenting_plan_exists', 'existing_order',
    'seeking_modification', 'assets_status', 'debts_status',
    'dv_present', 'immediate_safety_concerns', 'protective_order_exists',
    'county_of_filing', 'residency_duration_months',
    'prior_divorce_filings', 'prior_custody_orders', 'existing_attorney',
    'primary_goal', 'settlement_preference', 'litigation_tolerance',
    'documents_reviewed_ack', 'service_concerns',
    // Internal terms
    'missingFields', 'requiredFields', 'optionalFields', 'conditionalRequired',
    'schemaStep', 'currentSchemaStep', 'assertion_value', 'raw_payload',
];

// Build regex once at module load
const schemaKeyPattern = new RegExp(
    SCHEMA_KEY_BLOCKLIST.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
    'gi'
);

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get the natural-language question for a schema field.
 *
 * For indexed fields like 'biological_relation[0]', strips the index suffix
 * and looks up the base field name.
 *
 * In development: throws if the field has no mapping (so we catch gaps early).
 * In production: returns a sanitized fallback question.
 */
export function getFieldQuestion(field: string): string {
    // Strip array index suffixes: 'biological_relation[0]' → 'biological_relation'
    const baseField = field.replace(/\[.*$/, '').replace(/\s*\(.*$/, '');

    const question = FIELD_QUESTION_MAP[baseField];
    if (question) return question;

    // Dev assertion: fail loudly so missing copy is caught
    if (process.env.NODE_ENV === 'development') {
        console.error(
            `[PROMPT_COPY_MAP] ⚠️  No question copy for field "${field}" (base: "${baseField}"). Add it to promptCopyMap.ts.`
        );
    }

    // Production fallback: humanize the field name
    return `Could you tell me about your ${baseField.replace(/_/g, ' ')}?`;
}

/**
 * Strip schema keys and internal terms from AI-generated text.
 *
 * Replaces occurrences of schema keys with empty string, then cleans up
 * any resulting double-spaces or trailing punctuation artifacts.
 */
export function sanitizeSchemaKeys(text: string): string {
    let sanitized = text.replace(schemaKeyPattern, '');
    // Clean up double-spaces and orphaned quotes/backticks
    sanitized = sanitized.replace(/\s{2,}/g, ' ');
    sanitized = sanitized.replace(/[`'"]\s*[`'"]/g, '');
    sanitized = sanitized.trim();
    return sanitized;
}
