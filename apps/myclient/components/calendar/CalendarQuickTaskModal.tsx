import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { canEditCases } from '@/lib/permissions';

type CaseOption = {
  id: string;
  title: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
};

type CalendarQuickTaskModalProps = {
  open: boolean;
  firmId: string;
  role: string | null;
  initialDate: string;
  onClose: () => void;
  onCreated: () => void;
};

function formatCaseLabel(option: CaseOption) {
  if (option.title) return option.title;
  const name = `${option.client_last_name ?? ''}${option.client_first_name ? `, ${option.client_first_name}` : ''}`.trim();
  return name || 'Untitled case';
}

export default function CalendarQuickTaskModal({
  open,
  firmId,
  role,
  initialDate,
  onClose,
  onCreated,
}: CalendarQuickTaskModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CaseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseOption | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditor = canEditCases(role);

  useEffect(() => {
    if (!open) return;
    setDate(initialDate);
    setTitle('');
    setDescription('');
    setTime('');
    setSelectedCase(null);
    setQuery('');
    setResults([]);
    setError(null);
  }, [open, initialDate]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (active) {
          setError('Please sign in again.');
          setLoading(false);
        }
        return;
      }
      const params = new URLSearchParams({ q: query.trim() });
      const res = await fetch(`/api/myclient/cases/search?${params.toString()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!active) return;
      if (!res.ok || !payload.ok) {
        setError(payload.error || 'Unable to search cases.');
        setLoading(false);
        return;
      }
      setResults(Array.isArray(payload.cases) ? payload.cases : []);
      setLoading(false);
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  const handleCreate = async () => {
    if (!selectedCase || !title.trim() || !date) {
      setError('Please choose a case, add a title, and select a date.');
      return;
    }
    if (!isEditor) {
      setError('You do not have permission to create tasks.');
      return;
    }
    setSaving(true);
    setError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError('Please sign in again.');
      setSaving(false);
      return;
    }
    const res = await fetch('/api/myclient/tasks/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firmId,
        caseId: selectedCase.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: date,
        due_time: time || null,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      setError(payload.error || 'Unable to create task.');
      setSaving(false);
      return;
    }
    setSaving(false);
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close quick add task"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
      />
      <aside className="fixed right-0 top-16 z-50 h-[calc(100vh-64px)] w-full max-w-[520px] border-l border-[color:var(--border)] bg-[var(--surface-0)] shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Quick add task</h2>
              <p className="text-xs text-[color:var(--muted)]">Tie a task to a case and date.</p>
            </div>
            <button
              type="button"
              aria-label="Close quick add task"
              onClick={onClose}
              className="rounded-lg border border-[color:var(--border)] p-1.5 text-[color:var(--muted)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-5">
              <label className="grid gap-2 text-sm text-[color:var(--muted)]">
                Case
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search cases"
                  className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>
              {loading && <p className="text-xs text-[color:var(--muted)]">Searching…</p>}
              {results.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)]">
                  {results.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedCase(option);
                        setQuery(formatCaseLabel(option));
                        setResults([]);
                      }}
                      className="flex w-full items-start justify-between px-3 py-2 text-left text-sm text-[color:var(--muted)] hover:bg-white/5"
                    >
                      <span>{formatCaseLabel(option)}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCase && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-white">
                  Selected: {formatCaseLabel(selectedCase)}
                </div>
              )}

              <label className="grid gap-2 text-sm text-[color:var(--muted)]">
                Task title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>

              <label className="grid gap-2 text-sm text-[color:var(--muted)]">
                Description (optional)
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-[color:var(--muted)]">
                  Date
                  <input
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="grid gap-2 text-sm text-[color:var(--muted)]">
                  Time (optional)
                  <input
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                    className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-[color:var(--border)] px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[color:var(--muted-2)]">
                {isEditor ? 'Tasks are private to your firm.' : 'Admin/Attorney only'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!isEditor || saving}
                  className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
