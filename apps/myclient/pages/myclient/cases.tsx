import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';
import { useDebounce } from '@/lib/useDebounce';

type CaseRow = {
  id: string;
  title: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  matter_type: string | null;
  status: string;
  last_activity_at: string;
  created_at: string;
  county: string | null;
  state: string | null;
  case_number: string | null;
};

function getCaseDisplay(row: CaseRow) {
  const displayName =
    row.client_last_name || row.client_first_name
      ? `${row.client_last_name ?? ''}${row.client_first_name ? `, ${row.client_first_name}` : ''}`.trim()
      : row.title || 'Untitled case';
  const jurisdiction = [row.county, row.state].filter(Boolean).join(', ');
  const subtitle = [row.matter_type, jurisdiction, row.case_number ? `Case #${row.case_number}` : null]
    .filter(Boolean)
    .join(' • ');
  return { displayName, subtitle };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed' },
];

const SORT_OPTIONS = [
  { value: 'last_activity', label: 'Last activity' },
  { value: 'newest', label: 'Newest' },
  { value: 'client_last', label: 'Client last name' },
];

const STATUS_STYLES: Record<string, string> = {
  open: 'border-emerald-400/40 text-emerald-200',
  paused: 'border-amber-400/40 text-amber-200',
  closed: 'border-slate-400/40 text-slate-200',
};

function getRelativeTime(dateString: string) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CasesPage() {
  const { state } = useFirm();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [countyFilter, setCountyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('last_activity');

  const debouncedSearch = useDebounce(searchInput);

  const firmLabel = useMemo(() => (state.firmId ? state.firmId.slice(0, 8) : 'No firm'), [state.firmId]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let isMounted = true;
    const loadCases = async () => {
      setLoading(true);
      setQueryError(null);
      const { data, error } = await supabase
        .from('cases')
        .select('id, title, client_first_name, client_last_name, status, matter_type, county, state, case_number, last_activity_at, created_at')
        .eq('firm_id', state.firmId)
        .order('last_activity_at', { ascending: false })
        .limit(200);

      if (!isMounted) return;
      if (error) {
        setQueryError(error.message);
        setCases([]);
      } else {
        setCases(data ?? []);
      }
      setLoading(false);
    };

    loadCases();
    return () => {
      isMounted = false;
    };
  }, [state.authed, state.firmId]);

  const stateOptions = useMemo(() => {
    const values = cases.map((row) => row.state).filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort();
  }, [cases]);

  const countyOptions = useMemo(() => {
    const values = cases
      .filter((row) => (stateFilter === 'all' ? true : row.state === stateFilter))
      .map((row) => row.county)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(values)).sort();
  }, [cases, stateFilter]);

  const filteredCases = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();

    const filtered = cases.filter((row) => {
      if (statusFilter !== 'all' && row.status.toLowerCase() !== statusFilter) return false;
      if (stateFilter !== 'all' && row.state !== stateFilter) return false;
      if (countyFilter !== 'all' && row.county !== countyFilter) return false;
      if (term) {
        const haystack = [
          row.title,
          row.client_first_name,
          row.client_last_name,
          row.case_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'client_last') {
        const aKey = a.client_last_name || a.title || '';
        const bKey = b.client_last_name || b.title || '';
        return aKey.localeCompare(bKey);
      }
      const aDate = new Date(a.last_activity_at || a.created_at).getTime();
      const bDate = new Date(b.last_activity_at || b.created_at).getTime();
      return bDate - aDate;
    });
    return sorted;
  }, [cases, countyFilter, debouncedSearch, sortBy, stateFilter, statusFilter]);

  return (
    <>
      <Head>
        <title>MyClient | Cases</title>
      </Head>
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <div className="sticky top-6 z-10 -mx-8 mb-6 border-b border-white/10 bg-[var(--surface-1)] px-8 pb-6 pt-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link
                href="/myclient/app"
                className="text-sm text-[color:var(--text-2)] hover:text-white transition"
              >
                ← Back
              </Link>
              <h1 className="mt-3 text-3xl font-semibold text-white">Active Cases</h1>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Firm {firmLabel}</p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[360px]">
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by client, title, or case number"
                className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Status: {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Sort cases by"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  aria-label="Filter by state"
                  value={stateFilter}
                  onChange={(event) => {
                    setStateFilter(event.target.value);
                    setCountyFilter('all');
                  }}
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  <option value="all">State: All</option>
                  {stateOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  title="Filter by county"
                  value={countyFilter}
                  onChange={(event) => setCountyFilter(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  <option value="all">County: All</option>
                  {countyOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setStatusFilter('all');
                  setStateFilter('all');
                  setCountyFilter('all');
                  setSortBy('last_activity');
                }}
                disabled={
                  !searchInput.trim() &&
                  statusFilter === 'all' &&
                  stateFilter === 'all' &&
                  countyFilter === 'all' &&
                  sortBy === 'last_activity'
                }
                className="w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-2)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear filters
              </button>
            </div>
          </div>
        </div>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>}

        {queryError && (
          <div className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {queryError}
          </div>
        )}

        {state.authed && state.firmId && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-[color:var(--text-2)]">Loading...</p>
            ) : filteredCases.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-8 text-center">
                <h2 className="text-xl font-semibold text-white">No cases match your filters.</h2>
                <p className="mt-2 text-sm text-[color:var(--text-2)]">Start a new case intake to populate your dashboard.</p>
                <Link
                  href="/myclient/intake"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)]"
                >
                  New Case Intake
                </Link>
              </div>
            ) : (
              filteredCases.map((row) => {
                const { displayName, subtitle } = getCaseDisplay(row);
                const statusKey = row.status.toLowerCase();
                const statusClass = STATUS_STYLES[statusKey] ?? 'border-white/15 text-[color:var(--text-2)]';
                return (
                  <Link
                    key={row.id}
                    href={`/myclient/cases/${row.id}`}
                    className="block rounded-2xl border border-white/10 bg-[var(--surface-0)] px-4 py-4 transition hover:bg-white/5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-white">{displayName}</p>
                        <p className="mt-1 text-xs text-[color:var(--text-2)]">{subtitle || 'No details yet'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${statusClass}`}>{row.status}</span>
                        <span className="text-xs text-[color:var(--text-2)]">{getRelativeTime(row.last_activity_at || row.created_at)}</span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>
    </>
  );
}
