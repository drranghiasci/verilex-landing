import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canEditCases } from '@/lib/permissions';
import CalendarViewToggle from '@/components/calendar/CalendarViewToggle';
import MonthGrid from '@/components/calendar/MonthGrid';
import WeekGrid from '@/components/calendar/WeekGrid';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import DayTasksModal from '@/components/calendar/DayTasksModal';
import TaskPill, { CalendarTask } from '@/components/calendar/TaskPill';
import CalendarQuickTaskModal from '@/components/calendar/CalendarQuickTaskModal';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

const MAX_VISIBLE_TASKS = 3;
const DEFAULT_TIMEZONE = 'America/New_York';

type CalendarTaskWithMeta = CalendarTask & {
  date_key: string;
  time_label?: string | null;
};

function formatDateKeyInTz(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatTimeLabelInTz(date: Date, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatTimeKeyInTz(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function toUtcFromTimezone(dateKey: string, timeStr: string, timezone: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (!year || !month || !day) return null;
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
  const tzDate = new Date(
    utcGuess.toLocaleString('en-US', { timeZone: timezone }),
  );
  const offset = utcGuess.getTime() - tzDate.getTime();
  return new Date(utcGuess.getTime() + offset);
}

export default function CalendarPage() {
  const { state } = useFirm();
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<CalendarTaskWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [selectedDate, setSelectedDate] = useState<string | null>(formatDateKeyInTz(new Date(), DEFAULT_TIMEZONE));
  const [view, setView] = useState<CalendarView>('month');
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(anchorDate), [anchorDate]);
  const monthEnd = useMemo(() => endOfMonth(anchorDate), [anchorDate]);
  const todayKey = formatDateKeyInTz(new Date(), timezone);
  const canCreateTasks = canEditCases(state.role);

  const loadTimezone = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch('/api/myclient/me', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await res.json().catch(() => ({}));
    if (payload?.ok && payload.user?.timezone) {
      setTimezone(payload.user.timezone);
    }
  };

  useEffect(() => {
    if (!state.authed) return;
    loadTimezone();
  }, [state.authed]);

  useEffect(() => {
    setSelectedDate(formatDateKeyInTz(anchorDate, timezone));
  }, [anchorDate, timezone]);

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

      const rangeStartDate =
        view === 'month'
          ? monthStart
          : view === 'week'
            ? weekStart
            : anchorDate;
      const rangeEndDate =
        view === 'month'
          ? monthEnd
          : view === 'week'
            ? new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
            : anchorDate;

      const rangeStartKey = formatDateKeyInTz(rangeStartDate, timezone);
      const rangeEndKey = formatDateKeyInTz(rangeEndDate, timezone);
      const rangeStart = toUtcFromTimezone(rangeStartKey, '00:00', timezone);
      const rangeEnd = toUtcFromTimezone(rangeEndKey, '23:59', timezone);

      const params = new URLSearchParams();
      if (state.firmId) params.set('firmId', state.firmId);
      if (rangeStart) params.set('rangeStart', rangeStart.toISOString());
      if (rangeEnd) params.set('rangeEnd', rangeEnd.toISOString());
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
        const normalized = Array.isArray(payload.tasks)
          ? (payload.tasks as CalendarTask[]).map((task) => {
              const dueAtDate = task.due_at ? new Date(task.due_at) : null;
              const dateKey = dueAtDate ? formatDateKeyInTz(dueAtDate, timezone) : task.due_date;
              const timeLabel = dueAtDate ? formatTimeLabelInTz(dueAtDate, timezone) : null;
              const timeSort = dueAtDate ? formatTimeKeyInTz(dueAtDate, timezone) : task.due_time || '99:99';
              return {
                ...task,
                date_key: dateKey,
                time_label: timeLabel,
                due_time: task.due_time ?? (timeSort === '99:99' ? null : timeSort),
              };
            })
          : [];
        setTasks(normalized);
        setLoading(false);
      }
    };

    loadTasks();
    return () => {
      mounted = false;
    };
  }, [state.authed, state.firmId, monthStart, monthEnd, view, anchorDate, timezone, weekStart]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setView(media.matches ? 'agenda' : 'month');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    tasks.forEach((task) => {
      const key = task.date_key;
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    map.forEach((list, key) => {
      const sorted = [...list].sort((a, b) => {
        const aTime = a.due_time ? a.due_time : '99:99';
        const bTime = b.due_time ? b.due_time : '99:99';
        return aTime.localeCompare(bTime);
      });
      map.set(key, sorted);
    });
    return map;
  }, [tasks]);

  const monthDays = useMemo(() => {
    const days: Array<Date | null> = [];
    const start = startOfMonth(anchorDate);
    const startWeekday = start.getDay();
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    const totalDays = endOfMonth(anchorDate).getDate();
    for (let day = 1; day <= totalDays; day += 1) {
      days.push(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), day));
    }
    return days;
  }, [anchorDate]);

  const weekStart = useMemo(() => {
    const base = anchorDate;
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return start;
  }, [anchorDate]);

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + 14);
    const todayKeyLocal = formatDateKeyInTz(today, timezone);
    const endKey = formatDateKeyInTz(end, timezone);
    return tasks
      .filter((task) => task.date_key >= todayKeyLocal && task.date_key <= endKey)
      .sort((a, b) => {
        if (a.date_key === b.date_key) return (a.due_time ?? '').localeCompare(b.due_time ?? '');
        return a.date_key.localeCompare(b.date_key);
      });
  }, [tasks, timezone]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return null;
    return tasksByDate.get(selectedDate) ?? [];
  }, [selectedDate, tasksByDate]);

  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return anchorDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: timezone });
    }
    if (view === 'week') {
      const weekDate = new Date(weekStart);
      return `The Week of ${weekDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
      })}`;
    }
    if (view === 'day') {
      return anchorDate.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
      });
    }
    const isToday = formatDateKeyInTz(anchorDate, timezone) === todayKey;
    return isToday
      ? "Today's Agenda"
      : `${anchorDate.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          timeZone: timezone,
        })} Agenda`;
  }, [anchorDate, todayKey, view, weekStart, timezone]);

  const setAnchor = (date: Date) => {
    setAnchorDate(date);
    setSelectedDate(formatDateKeyInTz(date, timezone));
  };

  const handleSelectDate = (dateKey: string) => {
    const next = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(next.getTime())) return;
    setAnchor(next);
  };

  const handlePrev = () => {
    const next = new Date(anchorDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() - 1);
      next.setDate(1);
    } else if (view === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setAnchor(next);
  };

  const handleNext = () => {
    const next = new Date(anchorDate);
    if (view === 'month') {
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
    } else if (view === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setAnchor(next);
  };

  return (
    <>
      <Head>
        <title>MyClient | Calendar</title>
      </Head>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/myclient/app" className="text-sm text-[color:var(--muted)] hover:text-white transition">
              ← Back
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-white">Calendar</h1>
            <p className="mt-2 text-sm text-[color:var(--muted)]">Tasks and due dates across your firm.</p>
          </div>
          <CalendarViewToggle value={view} onChange={setView} />
        </div>

        {!state.authed && <p className="text-[color:var(--muted)]">Please sign in.</p>}
        {state.authed && !state.firmId && <p className="text-[color:var(--muted)]">No firm linked yet.</p>}
        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {state.authed && state.firmId && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setAnchor(new Date())}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white"
                >
                  Next
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-white">{headerTitle}</h2>
                <button
                  type="button"
                  onClick={() => setQuickAddDate(selectedDate ?? formatDateKeyInTz(new Date(), timezone))}
                  disabled={!canCreateTasks}
                  className="rounded-lg border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--muted)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Task
                </button>
              </div>
            </div>

            {view === 'month' && (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
                <div className="grid grid-cols-7 gap-3 text-xs text-[color:var(--muted)]">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center">
                      {day}
                    </div>
                  ))}
                </div>
                <MonthGrid
                  days={monthDays}
                  tasksByDate={tasksByDate}
                  selectedDate={selectedDate}
                  todayKey={todayKey}
                  getDateKey={(date) => formatDateKeyInTz(date, timezone)}
                  onSelectDate={handleSelectDate}
                  onOpenDayModal={setModalDate}
                  onQuickAdd={(dateKey) => setQuickAddDate(dateKey)}
                  canQuickAdd={canCreateTasks}
                  maxVisible={MAX_VISIBLE_TASKS}
                />
                {loading && <p className="mt-4 text-sm text-[color:var(--muted)]">Loading tasks…</p>}
              </div>
            )}

            {view === 'week' && (
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
                <WeekGrid
                  weekStart={weekStart}
                  tasksByDate={tasksByDate}
                  selectedDate={selectedDate}
                  todayKey={todayKey}
                  onSelectDate={handleSelectDate}
                  getDateKey={(date) => formatDateKeyInTz(date, timezone)}
                />
              </div>
            )}

            {view === 'day' && selectedDate && (
              <DayView dateKey={selectedDate} tasks={selectedTasks ?? []} todayKey={todayKey} timezone={timezone} />
            )}

            {view === 'agenda' && selectedDate && (
              <AgendaView dateKey={selectedDate} tasks={selectedTasks ?? []} todayKey={todayKey} timezone={timezone} />
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-white">Upcoming (14 days)</h2>
                {upcomingTasks.length === 0 ? (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">No upcoming tasks.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-[color:var(--muted)]">
                    {upcomingTasks.map((task) => (
                      <li
                        key={task.id}
                        className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-0)] px-3 py-2"
                      >
                        <TaskPill task={task} timeLabel={task.time_label ?? null} />
                        <p className="text-xs text-[color:var(--muted-2)]">
                          Due{' '}
                          {new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, {
                            timeZone: timezone,
                          })}
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
                  <div className="mt-3 space-y-2">
                    {selectedTasks.map((task) => (
                      <TaskPill key={task.id} task={task} timeLabel={task.time_label ?? null} />
                    ))}
                  </div>
                )}
                {!selectedDate && (
                  <p className="mt-3 text-sm text-[color:var(--muted)]">Pick a day to see tasks.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <DayTasksModal
        open={Boolean(modalDate)}
        dateLabel={
          modalDate
            ? new Date(`${modalDate}T00:00:00`).toLocaleDateString(undefined, { timeZone: timezone })
            : ''
        }
        tasks={modalDate ? tasksByDate.get(modalDate) ?? [] : []}
        timezone={timezone}
        onClose={() => setModalDate(null)}
      />
      {state.authed && state.firmId && quickAddDate && (
        <CalendarQuickTaskModal
          open={Boolean(quickAddDate)}
          firmId={state.firmId}
          role={state.role}
          initialDate={quickAddDate}
          onClose={() => setQuickAddDate(null)}
          onCreated={() => setAnchor(new Date(`${quickAddDate}T00:00:00`))}
        />
      )}
    </>
  );
}
