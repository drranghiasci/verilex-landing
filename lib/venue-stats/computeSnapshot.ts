/**
 * Venue Statistics Snapshot Computation
 * 
 * Computes immutable snapshots with n >= k suppression.
 * County-level only, boolean-only aggregation.
 */

import { createClient } from '@supabase/supabase-js';
import {
    MINIMUM_SAMPLE_SIZE,
    SENSITIVE_METRICS,
    isSensitiveMetric,
    type VenueStatsScope,
} from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TelemetryRow {
    field_presence: Record<string, boolean>;
    doc_presence: Record<string, boolean>;
    contradiction_types: string[];
}

interface ComputeSnapshotParams {
    venueState: string;
    venueCounty: string;
    matterType: string;
    scope: VenueStatsScope;
    firmId?: string;
    timeWindowMonths?: number; // Default: 12
}

/**
 * Compute a venue stats snapshot for a given scope.
 * Enforces n >= k suppression at the data layer.
 */
export async function computeVenueStatsSnapshot(params: ComputeSnapshotParams): Promise<{
    snapshotId: string;
    sampleSize: number;
    isSuppressed: boolean;
}> {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
        venueState,
        venueCounty,
        matterType,
        scope,
        firmId,
        timeWindowMonths = 12, // Rolling 12 months
    } = params;

    // Calculate time window
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - timeWindowMonths);

    // Query telemetry
    let query = supabase
        .from('venue_stats_telemetry')
        .select('field_presence, doc_presence, contradiction_types')
        .eq('venue_state', venueState)
        .eq('venue_county', venueCounty)
        .eq('matter_type', matterType)
        .gte('submitted_at', windowStart.toISOString());

    if (scope === 'firm' && firmId) {
        query = query.eq('firm_id', firmId);
    }

    const { data: telemetryRows, error: telemetryError } = await query;

    if (telemetryError) {
        throw new Error(`Failed to query telemetry: ${telemetryError.message}`);
    }

    const rows = (telemetryRows ?? []) as TelemetryRow[];
    const sampleSize = rows.length;

    // Determine suppression at snapshot level
    const isSuppressed = sampleSize < MINIMUM_SAMPLE_SIZE;
    const suppressionReason = isSuppressed ? 'Insufficient sample size' : null;

    // Insert snapshot
    const { data: snapshot, error: snapshotError } = await supabase
        .from('venue_stats_snapshots')
        .insert({
            venue_state: venueState,
            venue_county: venueCounty,
            matter_type: matterType,
            time_window_start: windowStart.toISOString().split('T')[0],
            time_window_end: now.toISOString().split('T')[0],
            scope,
            firm_id: scope === 'firm' ? firmId : null,
            sample_size: sampleSize,
            is_suppressed: isSuppressed,
            suppression_reason: suppressionReason,
        })
        .select('id')
        .single();

    if (snapshotError || !snapshot) {
        throw new Error(`Failed to create snapshot: ${snapshotError?.message}`);
    }

    // Compute metrics (even if suppressed, we store them internally)
    if (sampleSize > 0) {
        await computeAndStoreMetrics(supabase, snapshot.id, rows, sampleSize, isSuppressed);
    }

    return {
        snapshotId: snapshot.id,
        sampleSize,
        isSuppressed,
    };
}

/**
 * Compute prevalence metrics and store with suppression flags
 */
async function computeAndStoreMetrics(
    supabase: ReturnType<typeof createClient>,
    snapshotId: string,
    rows: TelemetryRow[],
    sampleSize: number,
    snapshotSuppressed: boolean
): Promise<void> {
    const fieldCounts: Record<string, number> = {};
    const docCounts: Record<string, number> = {};
    const contradictionCounts: Record<string, number> = {};

    // Aggregate counts
    for (const row of rows) {
        // Field presence
        for (const [key, present] of Object.entries(row.field_presence)) {
            if (present) {
                fieldCounts[key] = (fieldCounts[key] ?? 0) + 1;
            }
        }

        // Document presence
        for (const [key, present] of Object.entries(row.doc_presence)) {
            if (present) {
                docCounts[key] = (docCounts[key] ?? 0) + 1;
            }
        }

        // Contradiction types
        for (const type of row.contradiction_types) {
            contradictionCounts[type] = (contradictionCounts[type] ?? 0) + 1;
        }
    }

    const metrics: Array<{
        snapshot_id: string;
        metric_key: string;
        metric_type: 'field' | 'document' | 'contradiction';
        count: number;
        prevalence_pct: number;
        is_suppressed: boolean;
        suppression_reason: string | null;
    }> = [];

    // Build field metrics
    for (const [key, count] of Object.entries(fieldCounts)) {
        const prevalence = (count / sampleSize) * 100;
        const isSensitive = isSensitiveMetric(key);
        const isSuppressed = snapshotSuppressed || isSensitive;

        metrics.push({
            snapshot_id: snapshotId,
            metric_key: key,
            metric_type: 'field',
            count,
            prevalence_pct: Math.round(prevalence * 100) / 100,
            is_suppressed: isSuppressed,
            suppression_reason: isSensitive ? 'Sensitive metric' : (snapshotSuppressed ? 'Insufficient sample size' : null),
        });
    }

    // Build document metrics
    for (const [key, count] of Object.entries(docCounts)) {
        const prevalence = (count / sampleSize) * 100;

        metrics.push({
            snapshot_id: snapshotId,
            metric_key: key,
            metric_type: 'document',
            count,
            prevalence_pct: Math.round(prevalence * 100) / 100,
            is_suppressed: snapshotSuppressed,
            suppression_reason: snapshotSuppressed ? 'Insufficient sample size' : null,
        });
    }

    // Build contradiction metrics
    for (const [key, count] of Object.entries(contradictionCounts)) {
        const prevalence = (count / sampleSize) * 100;

        metrics.push({
            snapshot_id: snapshotId,
            metric_key: key,
            metric_type: 'contradiction',
            count,
            prevalence_pct: Math.round(prevalence * 100) / 100,
            is_suppressed: snapshotSuppressed,
            suppression_reason: snapshotSuppressed ? 'Insufficient sample size' : null,
        });
    }

    // Insert all metrics
    if (metrics.length > 0) {
        const { error } = await supabase
            .from('venue_stats_metrics')
            .insert(metrics);

        if (error) {
            console.error('Failed to insert metrics:', error.message);
        }
    }
}
