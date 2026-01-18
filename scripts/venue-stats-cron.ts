/**
 * Venue Statistics Nightly Cron Job
 * 
 * Run nightly to compute venue stats snapshots.
 * This is the ONLY way snapshots are created - no on-demand or submission-triggered runs.
 * 
 * Usage: npx ts-node scripts/venue-stats-cron.ts
 * Or via cron: 0 2 * * * cd /path/to/repo && npx ts-node scripts/venue-stats-cron.ts
 */

import { createClient } from '@supabase/supabase-js';

// Load env
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MINIMUM_SAMPLE_SIZE = 30;
const TIME_WINDOW_MONTHS = 12;

interface TelemetryRow {
    firm_id: string;
    venue_state: string;
    venue_county: string;
    matter_type: string;
    field_presence: Record<string, boolean>;
    doc_presence: Record<string, boolean>;
    contradiction_types: string[];
}

interface VenueKey {
    state: string;
    county: string;
    matterType: string;
}

interface FirmVenueKey extends VenueKey {
    firmId: string;
}

const SENSITIVE_METRICS = [
    'has_dv_indicator',
    'has_dv_details',
    'has_protective_order',
    'has_weapons_in_home',
    'has_safety_concerns',
];

function isSensitiveMetric(key: string): boolean {
    return SENSITIVE_METRICS.some(s => key.includes(s.replace('has_', '')));
}

async function main() {
    console.log(`[${new Date().toISOString()}] Starting venue stats cron job...`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate time window
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setMonth(windowStart.getMonth() - TIME_WINDOW_MONTHS);

    // Fetch all telemetry in window
    const { data: telemetryRows, error: telemetryError } = await supabase
        .from('venue_stats_telemetry')
        .select('firm_id, venue_state, venue_county, matter_type, field_presence, doc_presence, contradiction_types')
        .gte('submitted_at', windowStart.toISOString());

    if (telemetryError) {
        console.error('Failed to fetch telemetry:', telemetryError.message);
        process.exit(1);
    }

    const rows = (telemetryRows ?? []) as TelemetryRow[];
    console.log(`Found ${rows.length} telemetry rows in ${TIME_WINDOW_MONTHS}-month window`);

    if (rows.length === 0) {
        console.log('No telemetry to process. Exiting.');
        process.exit(0);
    }

    // Group by firm + venue (for firm-scoped snapshots)
    const firmGroups = new Map<string, TelemetryRow[]>();
    // Group by venue only (for global snapshots)
    const globalGroups = new Map<string, TelemetryRow[]>();

    for (const row of rows) {
        // Firm-scoped key
        const firmKey = `${row.firm_id}|${row.venue_state}|${row.venue_county}|${row.matter_type}`;
        if (!firmGroups.has(firmKey)) firmGroups.set(firmKey, []);
        firmGroups.get(firmKey)!.push(row);

        // Global key
        const globalKey = `${row.venue_state}|${row.venue_county}|${row.matter_type}`;
        if (!globalGroups.has(globalKey)) globalGroups.set(globalKey, []);
        globalGroups.get(globalKey)!.push(row);
    }

    console.log(`Processing ${firmGroups.size} firm-scoped groups and ${globalGroups.size} global groups`);

    // Process firm-scoped snapshots
    for (const [key, groupRows] of firmGroups) {
        const [firmId, state, county, matterType] = key.split('|');
        await createSnapshot(supabase, {
            scope: 'firm',
            firmId,
            state,
            county,
            matterType,
            rows: groupRows,
            windowStart,
            windowEnd: now,
        });
    }

    // Process global snapshots
    for (const [key, groupRows] of globalGroups) {
        const [state, county, matterType] = key.split('|');
        await createSnapshot(supabase, {
            scope: 'global',
            firmId: null,
            state,
            county,
            matterType,
            rows: groupRows,
            windowStart,
            windowEnd: now,
        });
    }

    console.log(`[${new Date().toISOString()}] Venue stats cron job complete.`);
}

async function createSnapshot(
    supabase: ReturnType<typeof createClient>,
    params: {
        scope: 'firm' | 'global';
        firmId: string | null;
        state: string;
        county: string;
        matterType: string;
        rows: TelemetryRow[];
        windowStart: Date;
        windowEnd: Date;
    }
) {
    const { scope, firmId, state, county, matterType, rows, windowStart, windowEnd } = params;
    const sampleSize = rows.length;
    const isSuppressed = sampleSize < MINIMUM_SAMPLE_SIZE;

    // Insert snapshot
    const { data: snapshot, error: snapshotError } = await supabase
        .from('venue_stats_snapshots')
        .insert({
            venue_state: state,
            venue_county: county,
            matter_type: matterType,
            time_window_start: windowStart.toISOString().split('T')[0],
            time_window_end: windowEnd.toISOString().split('T')[0],
            scope,
            firm_id: firmId,
            sample_size: sampleSize,
            is_suppressed: isSuppressed,
            suppression_reason: isSuppressed ? 'Insufficient sample size' : null,
        })
        .select('id')
        .single();

    if (snapshotError || !snapshot) {
        console.error(`Failed to create ${scope} snapshot for ${county}, ${state}:`, snapshotError?.message);
        return;
    }

    console.log(`Created ${scope} snapshot for ${county}, ${state}: n=${sampleSize}, suppressed=${isSuppressed}`);

    // Compute and store metrics
    if (sampleSize > 0) {
        await computeMetrics(supabase, snapshot.id, rows, sampleSize, isSuppressed);
    }
}

async function computeMetrics(
    supabase: ReturnType<typeof createClient>,
    snapshotId: string,
    rows: TelemetryRow[],
    sampleSize: number,
    snapshotSuppressed: boolean
) {
    const fieldCounts: Record<string, number> = {};
    const docCounts: Record<string, number> = {};
    const contradictionCounts: Record<string, number> = {};

    for (const row of rows) {
        for (const [key, present] of Object.entries(row.field_presence)) {
            if (present) fieldCounts[key] = (fieldCounts[key] ?? 0) + 1;
        }
        for (const [key, present] of Object.entries(row.doc_presence)) {
            if (present) docCounts[key] = (docCounts[key] ?? 0) + 1;
        }
        for (const type of row.contradiction_types) {
            contradictionCounts[type] = (contradictionCounts[type] ?? 0) + 1;
        }
    }

    const metrics: any[] = [];

    for (const [key, count] of Object.entries(fieldCounts)) {
        const prevalence = (count / sampleSize) * 100;
        const isSensitive = isSensitiveMetric(key);
        metrics.push({
            snapshot_id: snapshotId,
            metric_key: key,
            metric_type: 'field',
            count,
            prevalence_pct: Math.round(prevalence * 100) / 100,
            is_suppressed: snapshotSuppressed || isSensitive,
            suppression_reason: isSensitive ? 'Sensitive metric' : (snapshotSuppressed ? 'Insufficient sample size' : null),
        });
    }

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

    if (metrics.length > 0) {
        const { error } = await supabase.from('venue_stats_metrics').insert(metrics);
        if (error) {
            console.error('Failed to insert metrics:', error.message);
        }
    }
}

main().catch((err) => {
    console.error('Cron job failed:', err);
    process.exit(1);
});
