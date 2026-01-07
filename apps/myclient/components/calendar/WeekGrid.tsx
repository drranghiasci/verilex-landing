import TaskPill, { CalendarTask } from './TaskPill';

type WeekGridProps = {
  weekStart: Date;
  tasksByDate: Map<string, CalendarTask[]>;
  onSelectDate: (dateKey: string) => void;
  selectedDate: string | null;
  todayKey: string;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function WeekGrid({ weekStart, tasksByDate, onSelectDate, selectedDate, todayKey }: WeekGridProps) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-7">
      {days.map((date) => {
        const key = formatDateKey(date);
        const dayTasks = tasksByDate.get(key) ?? [];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(key)}
            className={[
              'min-h-[220px] rounded-xl border border-[color:var(--border)] bg-[var(--surface-0)] p-3 text-left transition hover:border-[color:var(--accent-light)]',
              selectedDate === key ? 'border-[color:var(--accent-light)]' : '',
              key === todayKey ? 'ring-1 ring-[color:var(--accent-light)]/60' : '',
            ].join(' ')}
          >
            <div className="flex items-center justify-between text-xs text-[color:var(--muted-2)]">
              <span>{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span>{date.getDate()}</span>
            </div>
            <div className="mt-3 space-y-2">
              {dayTasks.length === 0 ? (
                <p className="text-xs text-[color:var(--muted-2)]">No tasks</p>
              ) : (
                dayTasks.map((task) => <TaskPill key={task.id} task={task} />)
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
