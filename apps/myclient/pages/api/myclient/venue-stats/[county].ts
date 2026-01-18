/**
 * Venue Statistics API Route
 * 
 * GET /api/myclient/venue-stats/[county]
 * 
 * Attorney-only. Returns county-level statistics with n >= k suppression.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Inlined constants and types to avoid cross-package import
const MINIMUM_SAMPLE_SIZE = 30;

interface VenueStatsResponse {
    county: string;
    state: string;
    matter_type: string;
    sample_size: number;
    time_window: string;
    scope: 'firm' | 'global';
    suppressed: boolean;
    suppression_reason?: string;
    metrics: DisplayMetric[];
}

interface DisplayMetric {
    key: string;
    prevalence_pct: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

interface SnapshotRow {
    id: string;
    venue_state: string;
    venue_county: string;
    matter_type: string;
    time_window_start: string;
    time_window_end: string;
    scope: 'firm' | 'global';
    sample_size: number;
    is_suppressed: boolean;
    suppression_reason: string | null;
}

interface MetricRow {
    metric_key: string;
    prevalence_pct: number;
    is_suppressed: boolean;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, token);

    // Verify user is authenticated and a firm member
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        return res.status(401).json({ error: 'Invalid session' });
    }

    const { data: membership, error: memberError } = await supabase
        .from('firm_members')
        .select('firm_id, role')
        .eq('user_id', userData.user.id)
        .single();

    if (memberError || !membership) {
        return res.status(403).json({ error: 'Not a firm member' });
    }

    // Parse query params
    const county = req.query.county as string;
    const state = (req.query.state as string) || 'GA';
    const matterType = (req.query.matter_type as string) || 'divorce';
    const scope = (req.query.scope as 'firm' | 'global') || 'global';

    if (!county) {
        return res.status(400).json({ error: 'County is required' });
    }

    // HARD CONSTRAINT: Block any judge-level or lower granularity
    if (req.query.judge_id || req.query.courtroom_id || req.query.clerk_id || req.query.docket_id) {
        return res.status(400).json({
            error: 'Venue statistics are county-level only. Judge, courtroom, clerk, and docket identifiers are not permitted.'
        });
    }

    // Query latest snapshot
    let snapshotQuery = supabase
        .from('venue_stats_snapshots')
        .select('id, venue_state, venue_county, matter_type, time_window_start, time_window_end, scope, sample_size, is_suppressed, suppression_reason')
        .eq('venue_state', state)
        .eq('venue_county', county)
        .eq('matter_type', matterType)
        .eq('scope', scope)
        .order('computed_at', { ascending: false })
        .limit(1);

    if (scope === 'firm') {
        snapshotQuery = snapshotQuery.eq('firm_id', membership.firm_id);
    }

    const { data: snapshots, error: snapshotError } = await snapshotQuery;

    if (snapshotError) {
        return res.status(500).json({ error: snapshotError.message });
    }

    const snapshot = snapshots?.[0] as SnapshotRow | undefined;

    // No snapshot exists
    if (!snapshot) {
        const response: VenueStatsResponse = {
            county,
            state,
            matter_type: matterType,
            sample_size: 0,
            time_window: 'N/A',
            scope,
            suppressed: true,
            suppression_reason: 'No data available for this venue',
            metrics: [],
        };
        return res.status(200).json(response);
    }

    // Snapshot is suppressed (n < k)
    if (snapshot.is_suppressed) {
        const response: VenueStatsResponse = {
            county: snapshot.venue_county,
            state: snapshot.venue_state,
            matter_type: snapshot.matter_type,
            sample_size: snapshot.sample_size,
            time_window: `${snapshot.time_window_start} to ${snapshot.time_window_end}`,
            scope: snapshot.scope,
            suppressed: true,
            suppression_reason: snapshot.suppression_reason || 'Insufficient sample size',
            metrics: [],
        };
        return res.status(200).json(response);
    }

    // Fetch non-suppressed metrics
    const { data: metricsRows, error: metricsError } = await supabase
        .from('venue_stats_metrics')
        .select('metric_key, prevalence_pct, is_suppressed')
        .eq('snapshot_id', snapshot.id)
        .eq('is_suppressed', false)
        .order('prevalence_pct', { ascending: false });

    if (metricsError) {
        return res.status(500).json({ error: metricsError.message });
    }

    const metrics: DisplayMetric[] = ((metricsRows ?? []) as MetricRow[]).map(m => ({
        key: m.metric_key,
        prevalence_pct: m.prevalence_pct,
    }));

    const response: VenueStatsResponse = {
        county: snapshot.venue_county,
        state: snapshot.venue_state,
        matter_type: snapshot.matter_type,
        sample_size: snapshot.sample_size,
        time_window: `${snapshot.time_window_start} to ${snapshot.time_window_end}`,
        scope: snapshot.scope,
        suppressed: false,
        metrics,
    };

    return res.status(200).json(response);
}
