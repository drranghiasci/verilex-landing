import TaskPill, { CalendarTask } from './TaskPill';

type DayViewProps = {
  dateKey: string;
  tasks: CalendarTask[];
  todayKey: string;
  timezone: string;
};

export default function DayView({ dateKey, tasks, todayKey, timezone }: DayViewProps) {
  const isToday = dateKey === todayKey;
  const dateLabel = new Date(`${dateKey}T00:00:00`);
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-white">
        {dateLabel.toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          timeZone: timezone,
        })}
      </h2>
      {isToday && <p className="mt-1 text-xs text-[color:var(--accent-light)]">Today</p>}
      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No tasks for this day.</p>
        ) : (
          tasks.map((task) => (
            <TaskPill key={task.id} task={task} timeLabel={task.time_label ?? null} />
          ))
        )}
      </div>
    </div>
  );
}
