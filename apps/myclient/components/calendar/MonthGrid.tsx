import TaskPill, { CalendarTask } from './TaskPill';

type MonthGridProps = {
  days: Array<Date | null>;
  tasksByDate: Map<string, CalendarTask[]>;
  selectedDate: string | null;
  todayKey: string;
  onSelectDate: (dateKey: string) => void;
  onOpenDayModal: (dateKey: string) => void;
  maxVisible: number;
};

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function MonthGrid({
  days,
  tasksByDate,
  selectedDate,
  todayKey,
  onSelectDate,
  onOpenDayModal,
  maxVisible,
}: MonthGridProps) {
  return (
    <div className="mt-3 grid grid-cols-7 gap-3">
      {days.map((date, index) => {
        if (!date) {
          return <div key={`empty-${index}`} className="min-h-[120px] rounded-xl bg-transparent" />;
        }
        const key = formatDateKey(date);
        const dayTasks = tasksByDate.get(key) ?? [];
        const visibleTasks = dayTasks.slice(0, maxVisible);
        const remainingTasks = dayTasks.length - visibleTasks.length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(key)}
            className={[
              'relative min-h-[140px] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-0)] p-3 text-left text-xs transition hover:border-[color:var(--accent-light)]',
              selectedDate === key ? 'border-[color:var(--accent-light)]' : '',
              key === todayKey ? 'ring-1 ring-[color:var(--accent-light)]/60' : '',
            ].join(' ')}
          >
            <div className="absolute right-3 top-2 text-xs text-[color:var(--muted-2)]">
              {date.getDate()}
            </div>
            <div className="pt-6 space-y-1">
              {visibleTasks.map((task) => (
                <TaskPill key={task.id} task={task} dense />
              ))}
              {remainingTasks > 0 && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDayModal(key);
                  }}
                  className="h-6 w-full rounded-md border border-white/5 bg-transparent px-2 text-left text-[11px] text-[color:var(--muted-2)] hover:text-white"
                >
                  +{remainingTasks} more
                </button>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
