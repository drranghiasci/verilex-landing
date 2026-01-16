/**
 * Assertion Metadata Types
 * 
 * Every structured field in the intake must carry provenance metadata.
 * This is a legal shield — it proves attribution and source.
 */

/**
 * How the assertion was captured
 */
export type AssertionSourceType = 'chat' | 'upload' | 'manual';

/**
 * Level of evidence supporting the assertion
 */
export type EvidenceSupportLevel = 'none' | 'partial' | 'attached';

/**
 * Core assertion metadata — required for every field
 */
export interface AssertionMetadata {
    /** The actual value asserted by the client */
    assertion_value: unknown;

    /** Always 'client' for intake — we record, not assert */
    asserted_by: 'client';

    /** How this assertion was captured */
    source_type: AssertionSourceType;

    /** Reference to the transcript message ID, or null if not from chat */
    transcript_reference: string | null;

    /** Level of documentary evidence supporting this assertion */
    evidence_support_level: EvidenceSupportLevel;

    /** True if this contradicts another assertion in the record */
    contradiction_flag: boolean;

    /** Timestamp when assertion was recorded */
    recorded_at: string;
}

/**
 * Wraps a raw value with assertion metadata
 */
export function wrapAssertion(
    value: unknown,
    options: {
        source_type?: AssertionSourceType;
        transcript_reference?: string | null;
        evidence_support_level?: EvidenceSupportLevel;
        contradiction_flag?: boolean;
    } = {}
): AssertionMetadata {
    return {
        assertion_value: value,
        asserted_by: 'client',
        source_type: options.source_type ?? 'chat',
        transcript_reference: options.transcript_reference ?? null,
        evidence_support_level: options.evidence_support_level ?? 'none',
        contradiction_flag: options.contradiction_flag ?? false,
        recorded_at: new Date().toISOString(),
    };
}

/**
 * Extracts the raw value from an assertion (for display/processing)
 */
export function unwrapAssertion(field: unknown): unknown {
    if (isAssertionMetadata(field)) {
        return field.assertion_value;
    }
    // Backwards compatibility: raw values without metadata
    return field;
}

/**
 * Type guard to check if a value is wrapped with assertion metadata
 */
export function isAssertionMetadata(value: unknown): value is AssertionMetadata {
    return (
        typeof value === 'object' &&
        value !== null &&
        'assertion_value' in value &&
        'asserted_by' in value &&
        (value as AssertionMetadata).asserted_by === 'client'
    );
}

/**
 * Extracts all raw values from a payload (unwraps metadata)
 * Use this for display and backwards-compatible processing
 */
export function unwrapPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const unwrapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
        unwrapped[key] = unwrapAssertion(value);
    }
    return unwrapped;
}
