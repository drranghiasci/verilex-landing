import { useState, useMemo } from 'react';
import { IntakeRecord } from '../../../../lib/intake/intakeApi';
import { SchemaDef } from '../../../../lib/intake/schemas/types';
import Button from '../ui/Button';
import Card from '../ui/Card';

type IntakeType = 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children' | null;

type IntakeReviewProps = {
    intake: IntakeRecord;
    schema: SchemaDef;
    onSubmit: (questions: string) => Promise<void>;
    disabled?: boolean;
    intakeType?: IntakeType;
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

export default function IntakeReview({ intake, schema, onSubmit, disabled, intakeType }: IntakeReviewProps) {
    const [questions, setQuestions] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await onSubmit(questions);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Submission failed');
            setSubmitting(false);
        }
    };

    // Helper to render payload values
    const renderValue = (val: any) => {
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        if (!val) return '—';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const payload = intake.raw_payload || {};

    // Filter sections based on intake type
    const visibleSections = useMemo(() => {
        const excluded = intakeType ? (EXCLUDED_SECTIONS[intakeType] || []) : [];
        return schema.sections.filter(s =>
            s.id !== 'final_review' && !excluded.includes(s.id)
        );
    }, [schema.sections, intakeType]);

    return (
        <div className="review-container">
            <div className="review-header">
                <h1>Review Your Information</h1>
                <p>Please review the information you provided. When you're ready, submit your record to the firm.</p>
            </div>

            <div className="attribution-notice">
                <p><strong>Important:</strong> This record reflects the statements you provided.</p>
                <p>It is not legal advice and has not been reviewed by an attorney.</p>
            </div>

            <div className="review-sections">
                {visibleSections.map(section => {
                    // Only show sections that have data
                    const hasData = section.fields.some(f => !f.isSystem && payload[f.key] !== undefined);
                    if (!hasData) return null;

                    return (
                        <Card key={section.id} className="review-section-card">
                            <h3>{section.title}</h3>
                            <div className="field-grid">
                                {section.fields.filter(f => !f.isSystem && payload[f.key] !== undefined).map(field => {
                                    const val = payload[field.key];
                                    return (
                                        <div key={field.key} className="field-row">
                                            <span className="field-label">{field.key.replace(/_/g, ' ')}</span>
                                            <span className="field-value">{renderValue(val)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    );
                })}
            </div>

            <div className="final-actions">
                <Card className="questions-card">
                    <h3>Final Questions?</h3>
                    <p className="helper-text">Is there anything else you'd like the attorney to know?</p>
                    <textarea
                        className="questions-input"
                        rows={4}
                        placeholder="Type any questions or additional notes here..."
                        value={questions}
                        onChange={(e) => setQuestions(e.target.value)}
                        disabled={disabled || submitting}
                    />
                </Card>

                {error && <div className="error-banner">{error}</div>}

                <Button
                    variant="primary"
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={disabled || submitting}
                >
                    {submitting ? 'Submitting...' : 'Submit to Firm'}
                </Button>
            </div>

            <style jsx>{`
                .review-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    padding-bottom: 100px;
                }
                .review-header {
                    text-align: center;
                    margin-bottom: 32px;
                }
                .review-header h1 {
                    font-size: 24px;
                    margin-bottom: 8px;
                    color: var(--text-0);
                }
                .review-header p {
                    color: var(--text-2);
                }

                .attribution-notice {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 24px;
                    text-align: center;
                }
                .attribution-notice p {
                    font-size: 14px;
                    color: var(--text-1);
                    margin: 4px 0;
                }

                .review-sections {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    margin-bottom: 32px;
                }

                .review-section-card :global(.card) { 
                    padding: 20px; 
                }

                .review-section-card h3 {
                    font-size: 14px;
                    text-transform: uppercase;
                    color: var(--text-2);
                    border-bottom: 1px solid var(--border);
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }

                .field-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                }

                .field-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 14px;
                    border-bottom: 1px solid var(--border-subtle);
                    padding-bottom: 8px;
                }
                .field-row:last-child { border-bottom: none; padding-bottom: 0; }

                .field-label {
                    color: var(--text-2);
                    text-transform: capitalize;
                }
                .field-value {
                    color: var(--text-0);
                    font-weight: 500;
                    text-align: right;
                    max-width: 60%;
                }

                .final-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .questions-card :global(.card) {
                    padding: 20px;
                }
                
                .questions-card h3 {
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .helper-text {
                    font-size: 13px;
                    color: var(--text-2);
                    margin-bottom: 12px;
                }

                .questions-input {
                    width: 100%;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 12px;
                    color: var(--text-0);
                    font-family: inherit;
                    font-size: 15px;
                    resize: vertical;
                }
                .questions-input:focus {
                    outline: none;
                    border-color: var(--accent);
                }

                .submit-btn {
                    width: 100%;
                    padding: 16px;
                    font-size: 18px;
                    font-weight: 600;
                }

                .error-banner {
                    padding: 12px;
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error);
                    border-radius: 8px;
                    text-align: center;
                }
            `}</style>
        </div>
    );
}
