/**
 * Venue Statistics Panel
 * 
 * Attorney-only component displaying county-level observed patterns.
 * Strictly non-authoritative language. No forbidden words.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Inlined types to avoid cross-package import
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

interface VenueStatsPanelProps {
    county: string;
    state?: string;
    matterType?: string;
}

export default function VenueStatsPanel({
    county,
    state = 'GA',
    matterType = 'divorce',
}: VenueStatsPanelProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<VenueStatsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!county) return;

        const loadStats = async () => {
            setLoading(true);
            setError(null);

            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !sessionData.session?.access_token) {
                setError('Please sign in to view venue patterns.');
                setLoading(false);
                return;
            }

            const res = await fetch(
                `/api/myclient/venue-stats/${encodeURIComponent(county)}?state=${state}&matter_type=${matterType}&scope=global`,
                {
                    headers: {
                        Authorization: `Bearer ${sessionData.session.access_token}`,
                    },
                }
            );

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.error || 'Unable to load venue patterns.');
                setLoading(false);
                return;
            }

            const data = await res.json();
            setStats(data);
            setLoading(false);
        };

        loadStats();
    }, [county, state, matterType]);

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <p className="text-sm text-[color:var(--muted)]">Loading venue patterns...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
                <p className="text-sm text-red-300">{error}</p>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-5">
            {/* Header with non-authoritative language */}
            <h3 className="text-sm font-semibold text-white">
                Observed patterns (non-authoritative)
            </h3>

            {/* Disclaimer */}
            <p className="mt-2 text-xs text-[color:var(--muted)]">
                These patterns summarize what is commonly present in submitted records
                for {stats.county} County, {stats.state}. They are not legal guidance.
            </p>

            {/* Suppression notice */}
            {stats.suppressed ? (
                <div className="mt-4 rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-3 text-sm text-[color:var(--muted)]">
                    {stats.suppression_reason || 'Insufficient sample size to display observed patterns.'}
                </div>
            ) : (
                <>
                    {/* Metadata */}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[color:var(--muted)]">
                        <span>n = {stats.sample_size}</span>
                        <span>•</span>
                        <span>{stats.time_window}</span>
                        <span>•</span>
                        <span>{stats.scope === 'firm' ? 'Your firm' : 'Aggregated'}</span>
                    </div>

                    {/* Metrics list */}
                    {stats.metrics.length === 0 ? (
                        <p className="mt-4 text-sm text-[color:var(--muted)]">
                            No patterns available.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {stats.metrics.map((metric) => (
                                <li
                                    key={metric.key}
                                    className="flex items-center justify-between rounded-lg border border-white/10 bg-[var(--surface-1)] px-3 py-2 text-sm"
                                >
                                    <span className="text-[color:var(--text-2)]">
                                        {formatMetricLabel(metric.key)}
                                    </span>
                                    <span className="text-white">
                                        {metric.prevalence_pct.toFixed(1)}%
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}

/**
 * Format metric key to human-readable label
 * FORBIDDEN: required, must, mandatory, compliant, verified, court-ready, recommended, likely, predicted
 */
function formatMetricLabel(key: string): string {
    // Remove has_ prefix and format
    return key
        .replace(/^has_/, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
}
