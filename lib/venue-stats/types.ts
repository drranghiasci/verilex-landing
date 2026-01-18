/**
 * Venue Statistics Types
 * 
 * County-level, suppression-first, boolean-only design.
 * These types enforce the doctrine at the type level.
 */

// Minimum sample size required to display statistics
export const MINIMUM_SAMPLE_SIZE = 30;

// Sensitive metrics that are ALWAYS suppressed in display
export const SENSITIVE_METRICS = [
    'has_dv_indicator',
    'has_dv_details',
    'has_protective_order',
    'has_weapons_in_home',
    'has_safety_concerns',
] as const;

export type SensitiveMetric = typeof SENSITIVE_METRICS[number];

/**
 * Scope of venue statistics
 */
export type VenueStatsScope = 'firm' | 'global';

/**
 * Raw telemetry row (boolean-only)
 */
export interface VenueStatsTelemetry {
    id: string;
    firm_id: string;
    intake_id: string;
    venue_state: string;
    venue_county: string;
    matter_type: string;
    submitted_at: string;
    field_presence: Record<string, boolean>;
    doc_presence: Record<string, boolean>;
    contradiction_types: string[];
    created_at: string;
}

/**
 * Immutable snapshot
 */
export interface VenueStatsSnapshot {
    id: string;
    venue_state: string;
    venue_county: string;
    matter_type: string;
    time_window_start: string;
    time_window_end: string;
    scope: VenueStatsScope;
    firm_id: string | null;
    sample_size: number;
    is_suppressed: boolean;
    suppression_reason: string | null;
    computed_at: string;
}

/**
 * Individual metric with suppression flag
 */
export interface VenueStatsMetric {
    id: string;
    snapshot_id: string;
    metric_key: string;
    metric_type: 'field' | 'document' | 'contradiction';
    count: number;
    prevalence_pct: number;
    is_suppressed: boolean;
    suppression_reason: string | null;
}

/**
 * API response for venue stats query
 */
export interface VenueStatsResponse {
    county: string;
    state: string;
    matter_type: string;
    sample_size: number;
    time_window: string;
    scope: VenueStatsScope;
    suppressed: boolean;
    suppression_reason?: string;
    metrics: DisplayMetric[];
}

/**
 * Display-safe metric (never contains sensitive data)
 */
export interface DisplayMetric {
    key: string;
    prevalence_pct: number;
}

/**
 * Check if a metric key is sensitive
 */
export function isSensitiveMetric(key: string): boolean {
    return SENSITIVE_METRICS.some(s => key.includes(s.replace('has_', '')));
}

/**
 * Check if sample size meets minimum threshold
 */
export function meetsMinimumSampleSize(n: number): boolean {
    return n >= MINIMUM_SAMPLE_SIZE;
}

/**
 * Get suppression reason for a metric
 */
export function getSuppressionReason(
    metricKey: string,
    sampleSize: number
): string | null {
    if (!meetsMinimumSampleSize(sampleSize)) {
        return 'Insufficient sample size';
    }
    if (isSensitiveMetric(metricKey)) {
        return 'Sensitive metric';
    }
    return null;
}
