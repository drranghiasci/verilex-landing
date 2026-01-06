import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import CalendarViewToggle from '@/components/calendar/CalendarViewToggle';
import MonthGrid from '@/components/calendar/MonthGrid';
import WeekGrid from '@/components/calendar/WeekGrid';
import DayView from '@/components/calendar/DayView';
import AgendaView from '@/components/calendar/AgendaView';
import DayTasksModal from '@/components/calendar/DayTasksModal';
import TaskPill, { CalendarTask } from '@/components/calendar/TaskPill';

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

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

const MAX_VISIBLE_TASKS = 3;

export default function CalendarPage() {
  const { state } = useFirm();
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<CalendarView>('month');
  const [modalDate, setModalDate] = useState<string | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setView(media.matches ? 'agenda' : 'month');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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

  const weekStart = useMemo(() => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return start;
  }, [selectedDate]);

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
            <div className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] px-5 py-4 shadow-sm">
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
                  onSelectDate={setSelectedDate}
                  onOpenDayModal={setModalDate}
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
                  onSelectDate={setSelectedDate}
                />
              </div>
            )}

            {view === 'day' && selectedDate && (
              <DayView dateKey={selectedDate} tasks={selectedTasks ?? []} />
            )}

            {view === 'agenda' && <AgendaView tasks={tasks} />}

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
                        <TaskPill task={task} />
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
                  <div className="mt-3 space-y-2">
                    {selectedTasks.map((task) => (
                      <TaskPill key={task.id} task={task} />
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
        dateLabel={modalDate ? new Date(modalDate).toLocaleDateString() : ''}
        tasks={modalDate ? tasksByDate.get(modalDate) ?? [] : []}
        onClose={() => setModalDate(null)}
      />
    </>
  );
}
