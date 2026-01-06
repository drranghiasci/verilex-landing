import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import type { CaseTaskRow } from '@/types/tasks';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const RIBBON_STYLES: Record<string, string> = {
  red: 'border-l-red-500',
  orange: 'border-l-orange-500',
  yellow: 'border-l-yellow-400',
  green: 'border-l-emerald-500',
  blue: 'border-l-blue-500',
  pink: 'border-l-pink-500',
  purple: 'border-l-purple-500',
};

function getRibbonClass(color: string | null | undefined) {
  if (!color) return '';
  return RIBBON_STYLES[color] ?? '';
}

export default function CalendarPage() {
  const { state } = useFirm();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [tasks, setTasks] = useState<CaseTaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(currentMonth), [currentMonth]);
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;
    let mounted = true;
    const loadTasks = async () => {
      setLoading(true);
      setError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        if (mounted) {
          setError(sessionError?.message || 'Please sign in.');
          setLoading(false);
        }
        return;
      }

      const params = new URLSearchParams({
        ...(state.firmId ? { firmId: state.firmId } : {}),
        from: formatDateKey(monthStart),
        to: formatDateKey(monthEnd),
      });
      const res = await fetch(`/api/myclient/tasks/list?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.ok) {
        if (mounted) {
          setError(payload.error || 'Unable to load tasks.');
          setTasks([]);
          setLoading(false);
        }
        return;
      }
      if (mounted) {
        setTasks(Array.isArray(payload.tasks) ? payload.tasks : []);
        setLoading(false);
      }
    };

    loadTasks();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId, monthStart, monthEnd]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CaseTaskRow[]>();
    tasks.forEach((task) => {
      const key = task.due_date;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [tasks]);

  const monthDays = useMemo(() => {
    const days: Array<Date | null> = [];
    const start = startOfMonth(currentMonth);
    const startWeekday = start.getDay();
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    const totalDays = endOfMonth(currentMonth).getDate();
    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }
    return days;
  }, [currentMonth]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 14);
    return tasks
      .filter((task) => {
        const due = new Date(task.due_date);
        return due >= today && due <= end;
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return null;
    return tasksByDate.get(selectedDate) ?? [];
  }, [selectedDate, tasksByDate]);

  return (
    <>
      <Head>
        <title>MyClient | Calendar</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/myclient/app" className="text-sm text-[color:var(--muted)] hover:text-white transition">
            ← Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-white">Calendar</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">Tasks and due dates across your firm.</p>
        </div>

        {!state.authed && <p className="text-[color:var(--muted)]">Please sign in.</p>}
        {state.authed && !state.firmId && <p className="text-[color:var(--muted)]">No firm linked yet.</p>}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {state.authed && state.firmId && (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white"
                >
                  Prev
                </button>
                <h2 className="text-lg font-semibold text-white">
                  {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white"
                >
                  Next
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-[color:var(--muted)]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center">
                    {day}
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-7 gap-2">
                {monthDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-20 rounded-lg bg-transparent" />;
                  }
                  const key = formatDateKey(date);
                  const dayTasks = tasksByDate.get(key) ?? [];
                  const visibleTasks = dayTasks.slice(0, 2);
                  const remainingTasks = dayTasks.length - visibleTasks.length;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={[
                        'relative h-20 overflow-hidden rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] p-2 text-left text-xs transition hover:border-[color:var(--accent-light)]',
                        selectedDate === key ? 'border-[color:var(--accent-light)]' : '',
                      ].join(' ')}
                    >
                      <div className="absolute right-2 top-2 text-xs text-[color:var(--muted-2)]">
                        {date.getDate()}
                      </div>
                      <div className="pt-6 space-y-1">
                        {visibleTasks.map((task) => (
                          <div
                            key={task.id}
                            className={`h-5 truncate rounded-md border border-white/10 bg-[var(--surface-1)] px-2 py-0.5 text-[11px] text-[color:var(--text)] ${
                              task.ribbon_color ? `border-l-4 ${getRibbonClass(task.ribbon_color)} pl-1.5` : ''
                            }`}
                          >
                            {task.title}
                          </div>
                        ))}
                        {remainingTasks > 0 && (
                          <div className="h-5 truncate rounded-md border border-white/5 bg-transparent px-2 py-0.5 text-[11px] text-[color:var(--muted-2)]">
                            +{remainingTasks} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {loading && <p className="mt-4 text-sm text-[color:var(--muted)]">Loading tasks…</p>}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">Upcoming (14 days)</h2>
                {upcomingTasks.length === 0 ? (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">No upcoming tasks.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-[color:var(--muted)]">
                {upcomingTasks.map((task) => (
                      <li
                        key={task.id}
                        className={`rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-3 py-2 ${
                          task.ribbon_color ? `border-l-4 ${getRibbonClass(task.ribbon_color)} pl-2` : ''
                        }`}
                      >
                        <p className="truncate text-white">{task.title}</p>
                        <p className="text-xs text-[color:var(--muted-2)]">
                          Due {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">
                  {selectedDate ? `Tasks on ${selectedDate}` : 'Select a day'}
                </h2>
                {selectedDate && selectedTasks && selectedTasks.length === 0 && (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">No tasks on this day.</p>
                )}
                {selectedDate && selectedTasks && selectedTasks.length > 0 && (
                  <ul className="mt-3 space-y-3 text-sm text-[color:var(--muted)]">
                    {selectedTasks.map((task) => (
                      <li
                        key={task.id}
                        className={`rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-3 py-2 ${
                          task.ribbon_color ? `border-l-4 ${getRibbonClass(task.ribbon_color)} pl-2` : ''
                        }`}
                      >
                        <p className="text-white">{task.title}</p>
                        <p className="text-xs text-[color:var(--muted-2)]">
                          Status {task.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                {!selectedDate && (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">Pick a day to see tasks.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
