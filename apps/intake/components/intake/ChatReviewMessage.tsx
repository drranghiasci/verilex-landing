/**
 * ChatReviewMessage - Renders intake review as a chat message
 * 
 * Displays review content inside the chat interface with:
 * - Structured read-only summary grouped by section
 * - Intake-type aware section filtering
 * - Submit button
 * - NO attorney metadata (asserted_by, recorded_at, etc.)
 */

import { useMemo } from 'react';
import { IntakeRecord } from '../../../../lib/intake/intakeApi';
import { SchemaDef } from '../../../../lib/intake/schemas/types';
import Button from '../ui/Button';

type IntakeType = 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children' | null;

type ChatReviewMessageProps = {
    intake: IntakeRecord;
    schema: SchemaDef;
    intakeType?: IntakeType;
    onSubmit: () => void;
    onCorrection?: (message: string) => void;
    submitting?: boolean;
    submitted?: boolean;
};

// Sections to exclude by intake type
const EXCLUDED_SECTIONS: Record<string, string[]> = {
    custody_unmarried: [
        'marriage_details',
        'separation_grounds',
        'marriage',
        'grounds',
        'asset_object',
        'debt_object',
    ],
    divorce_no_children: [
        'child_object',
        'children_custody',
        'children_gate',
        'children_details',
        'custody_preferences',
        'custody',
    ],
};

// Friendly section labels
const SECTION_LABELS: Record<string, string> = {
    intake_metadata: 'MATTER METADATA',
    client_identity: 'CLIENT IDENTITY',
    opposing_party: 'OPPOSING PARTY',
    marriage_details: 'MARRIAGE',
    separation_grounds: 'SEPARATION & GROUNDS',
    child_object: 'CHILDREN',
    children_custody: 'CUSTODY PREFERENCES',
    children_gate: 'CHILDREN CONFIRMATION',
    asset_object: 'ASSETS',
    liabilities_debts: 'DEBTS',
    debt_object: 'DEBTS',
    income_support: 'INCOME & SUPPORT',
    domestic_violence_risk: 'DOMESTIC VIOLENCE / SAFETY',
    safety_risk: 'DOMESTIC VIOLENCE / SAFETY',
    jurisdiction_venue: 'JURISDICTION & VENUE',
    prior_legal_actions: 'PRIOR LEGAL ACTIONS',
    desired_outcomes: 'DESIRED OUTCOMES',
    evidence_documents: 'EVIDENCE & DOCUMENTS',
    assets_property: 'ASSETS & PROPERTY',
};

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
    client_first_name: 'First Name',
    client_last_name: 'Last Name',
    client_dob: 'Date of Birth',
    client_phone: 'Phone',
    client_email: 'Email',
    client_address: 'Address',
    client_county: 'County',
    opposing_first_name: 'First Name',
    opposing_last_name: 'Last Name',
    opposing_address_known: 'Address Known',
    opposing_last_known_address: 'Last Known Address',
    service_concerns: 'Service Concerns',
    date_of_marriage: 'Date of Marriage',
    place_of_marriage: 'Place of Marriage',
    currently_cohabitating: 'Currently Cohabitating',
    date_of_separation: 'Date of Separation',
    grounds_for_divorce: 'Grounds for Divorce',
    has_minor_children: 'Has Minor Children',
    client_income_monthly: 'Monthly Income',
    opposing_income_known: 'Spouse Income Known',
    support_requested: 'Support Requested',
    dv_present: 'Domestic Violence Present',
    immediate_safety_concerns: 'Immediate Safety Concerns',
    protective_order_exists: 'Protective Order Exists',
    county_of_filing: 'Filing County',
    residency_duration_months: 'Residency Duration (months)',
    prior_divorce_filings: 'Prior Divorce Filings',
    existing_attorney: 'Has Existing Attorney',
    primary_goal: 'Primary Goal',
    settlement_preference: 'Settlement Preference',
    litigation_tolerance: 'Litigation Tolerance',
    documents_reviewed_ack: 'Document Acknowledgment',
    urgency_level: 'Urgency Level',
    intake_channel: 'Intake Channel',
    assets_status: 'Assets Status',
    debts_status: 'Debts Status',
};

// Helper to extract display value from payload (unwrap assertion_value)
function extractDisplayValue(val: unknown): string {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') return val || '—';

    // Handle wrapped assertion values
    if (typeof val === 'object' && 'assertion_value' in val) {
        return extractDisplayValue((val as { assertion_value: unknown }).assertion_value);
    }

    // For other objects, show summary
    if (typeof val === 'object') {
        if (Array.isArray(val)) {
            return val.length > 0 ? `${val.length} item(s)` : '—';
        }
        return 'See details';
    }

    return String(val);
}

export default function ChatReviewMessage({
    intake,
    schema,
    intakeType,
    onSubmit,
    submitting = false,
    submitted = false,
}: ChatReviewMessageProps) {
    const payload = intake.raw_payload || {};

    // Filter sections based on intake type
    const visibleSections = useMemo(() => {
        const excluded = intakeType ? (EXCLUDED_SECTIONS[intakeType] || []) : [];
        return schema.sections.filter(s =>
            s.id !== 'final_review' && !excluded.includes(s.id)
        );
    }, [schema.sections, intakeType]);

    return (
        <div className="chat-review-message">
            {/* Introduction */}
            <div className="review-intro">
                <h3>Review Your Information</h3>
                <p>Please review the information you provided below.<br />
                    When you're ready, you can submit it to the firm.</p>
            </div>

            {/* Attribution Notice */}
            <div className="attribution-notice">
                <p><strong>Important:</strong></p>
                <p>• This record reflects the statements you provided.</p>
                <p>• It is not legal advice.</p>
                <p>• It has not been reviewed by an attorney.</p>
            </div>

            {/* Sections */}
            <div className="review-sections">
                {visibleSections.map(section => {
                    // Get non-system fields that have values
                    const fieldsWithValues = section.fields.filter(
                        f => !f.isSystem && payload[f.key] !== undefined
                    );

                    if (fieldsWithValues.length === 0) return null;

                    return (
                        <div key={section.id} className="review-section">
                            <div className="section-header">
                                {SECTION_LABELS[section.id] || section.title.toUpperCase()}
                            </div>
                            <div className="section-fields">
                                {fieldsWithValues.map(field => (
                                    <div key={field.key} className="field-row">
                                        <span className="field-label">
                                            {FIELD_LABELS[field.key] || field.key.replace(/_/g, ' ')}
                                        </span>
                                        <span className="field-value">
                                            {extractDisplayValue(payload[field.key])}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Correction Prompt */}
            {!submitted && (
                <div className="correction-prompt">
                    <p>If anything above looks incorrect, you can simply tell me what needs to be changed<br />
                        (for example: "My income is wrong" or "I need to update my address").</p>
                    <p>If everything looks correct, click <strong>Submit to Firm</strong> below.</p>
                </div>
            )}

            {/* Submit Button */}
            {!submitted && (
                <Button
                    variant="primary"
                    className="submit-button"
                    onClick={onSubmit}
                    disabled={submitting}
                >
                    {submitting ? 'Submitting...' : 'Submit to Firm'}
                </Button>
            )}

            {/* Success Message */}
            {submitted && (
                <div className="success-message">
                    <p>✓ <strong>Thank you.</strong> Your information has been submitted to the firm.</p>
                    <p>An attorney or staff member will review it and follow up with you directly.</p>
                </div>
            )}

            <style jsx>{`
                .chat-review-message {
                    max-width: 100%;
                    padding: 16px 0;
                }
                
                .review-intro h3 {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--text-0);
                    margin-bottom: 8px;
                }
                
                .review-intro p {
                    color: var(--text-1);
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 16px;
                }
                
                .attribution-notice {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    padding: 12px 16px;
                    margin-bottom: 20px;
                }
                
                .attribution-notice p {
                    font-size: 13px;
                    color: var(--text-1);
                    margin: 2px 0;
                }
                
                .review-sections {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 20px;
                }
                
                .review-section {
                    background: var(--surface-1);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .section-header {
                    font-size: 12px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-2);
                    background: var(--surface-2);
                    padding: 10px 14px;
                    border-bottom: 1px solid var(--border);
                }
                
                .section-fields {
                    padding: 12px 14px;
                }
                
                .field-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    font-size: 14px;
                    padding: 6px 0;
                    border-bottom: 1px solid var(--border-subtle);
                }
                
                .field-row:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                }
                
                .field-label {
                    color: var(--text-2);
                    text-transform: capitalize;
                    flex-shrink: 0;
                    margin-right: 12px;
                }
                
                .field-value {
                    color: var(--text-0);
                    font-weight: 500;
                    text-align: right;
                    word-break: break-word;
                }
                
                .correction-prompt {
                    background: var(--surface-2);
                    border-radius: 8px;
                    padding: 14px;
                    margin-bottom: 16px;
                }
                
                .correction-prompt p {
                    font-size: 14px;
                    color: var(--text-1);
                    line-height: 1.5;
                    margin: 0 0 8px 0;
                }
                
                .correction-prompt p:last-child {
                    margin-bottom: 0;
                }
                
                .submit-button {
                    width: 100%;
                    padding: 14px;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .success-message {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 8px;
                    padding: 16px;
                    text-align: center;
                }
                
                .success-message p {
                    font-size: 14px;
                    color: var(--text-0);
                    margin: 4px 0;
                }
            `}</style>
        </div>
    );
}
