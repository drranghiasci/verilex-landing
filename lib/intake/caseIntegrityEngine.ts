/**
 * Case Integrity Engine — Thin Version
 * 
 * This is the MINIMUM SAFE integrity layer.
 * It surfaces observable, non-authoritative observations about record completeness.
 * 
 * ALLOWED OUTPUTS:
 * - Missing required fields
 * - Contradictions between fields
 * - Evidence insufficiency
 * 
 * DISALLOWED (deferred):
 * - Venue statistics
 * - Risk scoring
 * - Strategy recommendations
 * - Outcome predictions
 */

import { GA_DIVORCE_CUSTODY_V1 } from './schemas/ga/family_law/divorce_custody.v1';
import { getEnabledSectionIds } from './gating';
import { unwrapAssertion, isAssertionMetadata, type AssertionMetadata } from './assertionTypes';

/**
 * A structural observation about the intake record
 */
export interface IntegrityObservation {
    /** Category of observation */
    category: 'missing_field' | 'contradiction' | 'evidence_gap';

    /** Severity for attorney prioritization */
    severity: 'low' | 'medium' | 'high';

    /** Human-readable summary */
    summary: string;

    /** Field keys involved */
    fields: string[];

    /** Section ID for navigation */
    sectionId?: string;
}

/**
 * Result of Case Integrity analysis
 */
export interface CaseIntegrityResult {
    /** All observations found */
    observations: IntegrityObservation[];

    /** Quick counts for UI display */
    summary: {
        missingRequired: number;
        contradictions: number;
        evidenceGaps: number;
        total: number;
    };

    /** Timestamp of analysis */
    analyzed_at: string;
}

/**
 * Analyze an intake payload for structural integrity
 */
export function analyzeCaseIntegrity(
    payload: Record<string, unknown>,
    options: { matterType?: string } = {}
): CaseIntegrityResult {
    const observations: IntegrityObservation[] = [];
    const enabledSectionIds = new Set(getEnabledSectionIds(payload as Record<string, any>));

    // 1. Missing required fields
    for (const section of GA_DIVORCE_CUSTODY_V1.sections) {
        if (!enabledSectionIds.has(section.id)) continue;

        for (const field of section.fields) {
            if (field.isSystem) continue;
            if (!field.required) continue;

            const rawValue = unwrapAssertion(payload[field.key]);
            if (rawValue === undefined || rawValue === null || rawValue === '') {
                observations.push({
                    category: 'missing_field',
                    severity: 'high',
                    summary: `Required field "${formatLabel(field.key)}" is missing`,
                    fields: [field.key],
                    sectionId: section.id,
                });
            }
        }
    }

    // 2. Contradiction detection (simple heuristics)
    const contradictions = detectContradictions(payload);
    observations.push(...contradictions);

    // 3. Evidence gaps (high-impact fields without support)
    const evidenceGaps = detectEvidenceGaps(payload);
    observations.push(...evidenceGaps);

    return {
        observations,
        summary: {
            missingRequired: observations.filter(o => o.category === 'missing_field').length,
            contradictions: observations.filter(o => o.category === 'contradiction').length,
            evidenceGaps: observations.filter(o => o.category === 'evidence_gap').length,
            total: observations.length,
        },
        analyzed_at: new Date().toISOString(),
    };
}

/**
 * Detect simple contradictions between fields
 */
function detectContradictions(payload: Record<string, unknown>): IntegrityObservation[] {
    const observations: IntegrityObservation[] = [];

    // Example: has_children = false but child_count > 0
    const hasChildren = unwrapAssertion(payload.has_children);
    const childCount = unwrapAssertion(payload.child_count);

    if (hasChildren === false && typeof childCount === 'number' && childCount > 0) {
        observations.push({
            category: 'contradiction',
            severity: 'high',
            summary: 'Client indicates no children, but child count is greater than zero',
            fields: ['has_children', 'child_count'],
        });
    }

    // Example: date_of_separation before date_of_marriage
    const marriage = unwrapAssertion(payload.date_of_marriage);
    const separation = unwrapAssertion(payload.date_of_separation);

    if (marriage && separation && typeof marriage === 'string' && typeof separation === 'string') {
        const marriageDate = new Date(marriage);
        const separationDate = new Date(separation);
        if (separationDate < marriageDate) {
            observations.push({
                category: 'contradiction',
                severity: 'high',
                summary: 'Date of separation is before date of marriage',
                fields: ['date_of_marriage', 'date_of_separation'],
            });
        }
    }

    // Check for fields that have contradiction_flag set
    for (const [key, value] of Object.entries(payload)) {
        if (isAssertionMetadata(value) && value.contradiction_flag) {
            observations.push({
                category: 'contradiction',
                severity: 'medium',
                summary: `Field "${formatLabel(key)}" was flagged as potentially contradictory`,
                fields: [key],
            });
        }
    }

    return observations;
}

/**
 * Detect high-impact assertions without evidence
 */
function detectEvidenceGaps(payload: Record<string, unknown>): IntegrityObservation[] {
    const observations: IntegrityObservation[] = [];

    // High-impact fields that benefit from documentation
    const highImpactFields = [
        'client_income',
        'opposing_income',
        'property_value',
        'debt_amount',
        'date_of_marriage',
        'date_of_separation',
    ];

    for (const fieldKey of highImpactFields) {
        const value = payload[fieldKey];
        if (!value) continue;

        if (isAssertionMetadata(value)) {
            if (value.evidence_support_level === 'none') {
                const rawValue = unwrapAssertion(value);
                if (rawValue !== undefined && rawValue !== null) {
                    observations.push({
                        category: 'evidence_gap',
                        severity: 'low',
                        summary: `High-impact field "${formatLabel(fieldKey)}" has no supporting documents`,
                        fields: [fieldKey],
                    });
                }
            }
        }
    }

    return observations;
}

/**
 * Format a field key as a human-readable label
 */
function formatLabel(key: string): string {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
