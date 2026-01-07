import { useEffect, useMemo, useState } from 'react';
import TaskPill, { CalendarTask } from './TaskPill';

type AgendaViewProps = {
  dateKey: string;
  tasks: CalendarTask[];
  todayKey: string;
  timezone: string;
};

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 48;

function parseMinutes(time: string | null | undefined) {
  if (!time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getMinutesInTimezone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export default function AgendaView({ dateKey, tasks, todayKey, timezone }: AgendaViewProps) {
  const [nowOffset, setNowOffset] = useState<number | null>(null);
  const isToday = dateKey === todayKey;

  useEffect(() => {
    if (!isToday) {
      setNowOffset(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const minutes = getMinutesInTimezone(now, timezone);
      const start = START_HOUR * 60;
      const end = END_HOUR * 60;
      if (minutes === null || minutes < start || minutes > end) {
        setNowOffset(null);
        return;
      }
      const total = end - start;
      setNowOffset(((minutes - start) / total) * (HOUR_HEIGHT * (END_HOUR - START_HOUR)));
    };
    update();
    const id = window.setInterval(update, 60000);
    return () => window.clearInterval(id);
  }, [isToday]);

  const tasksWithTime = useMemo(() => {
    return tasks
      .filter((task) => task.due_at || task.due_time)
      .sort((a, b) => {
        const aTime = a.due_time ?? (a.due_at ? a.due_at : '') ?? '';
        const bTime = b.due_time ?? (b.due_at ? b.due_at : '') ?? '';
        return aTime.localeCompare(bTime);
      });
  }, [tasks]);

  const tasksNoTime = useMemo(() => {
    return tasks.filter((task) => !task.due_time && !task.due_at);
  }, [tasks]);

  if (tasks.length === 0) {
    return <p className="text-sm text-[color:var(--muted)]">No tasks scheduled for this day.</p>;
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-white">
        {new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: timezone,
        })}
      </h3>
      <div className="mt-4 space-y-6">
        <div className="relative rounded-xl border border-[color:var(--border)] bg-[var(--surface-0)] p-4">
          <div className="relative" style={{ height: `${HOUR_HEIGHT * (END_HOUR - START_HOUR)}px` }}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }).map((_, idx) => {
              const hour = START_HOUR + idx;
              return (
                <div key={hour} className="relative h-12 border-t border-white/5 text-xs text-[color:var(--muted-2)]">
                  <span className="absolute -top-2 left-0">{hour % 12 === 0 ? 12 : hour % 12}{hour < 12 ? 'a' : 'p'}</span>
                </div>
              );
            })}

            {nowOffset !== null && (
              <div className="absolute left-0 right-0 flex items-center" style={{ top: nowOffset }}>
                <span className="mr-2 text-xs text-red-400">Now</span>
                <div className="h-px flex-1 bg-red-400" />
              </div>
            )}

            {tasksWithTime.map((task) => {
              const minutes = task.due_at
                ? getMinutesInTimezone(new Date(task.due_at), timezone)
                : parseMinutes(task.due_time);
              if (minutes === null) return null;
              const start = START_HOUR * 60;
              const end = END_HOUR * 60;
              if (minutes < start || minutes > end) return null;
              const top = ((minutes - start) / (end - start)) * (HOUR_HEIGHT * (END_HOUR - START_HOUR));
              return (
                <div key={task.id} className="absolute left-14 right-2" style={{ top }}>
                  <TaskPill task={task} timeLabel={task.time_label ?? null} />
                </div>
              );
            })}
          </div>
        </div>

        {tasksNoTime.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-[color:var(--muted-2)]">No time set</p>
            <div className="mt-2 space-y-2">
              {tasksNoTime.map((task) => (
                <TaskPill key={task.id} task={task} timeLabel={task.time_label ?? null} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
