import TaskPill, { CalendarTask } from './TaskPill';

type MonthGridProps = {
  days: Array<Date | null>;
  tasksByDate: Map<string, CalendarTask[]>;
  selectedDate: string | null;
  todayKey: string;
  getDateKey: (date: Date) => string;
  onSelectDate: (dateKey: string) => void;
  onOpenDayModal: (dateKey: string) => void;
  onQuickAdd?: (dateKey: string) => void;
  canQuickAdd?: boolean;
  maxVisible: number;
};

export default function MonthGrid({
  days,
  tasksByDate,
  selectedDate,
  todayKey,
  getDateKey,
  onSelectDate,
  onOpenDayModal,
  onQuickAdd,
  canQuickAdd,
  maxVisible,
}: MonthGridProps) {
  return (
    <div className="mt-3 grid grid-cols-7 gap-3">
      {days.map((date, index) => {
        if (!date) {
          return <div key={`empty-${index}`} className="min-h-[120px] rounded-xl bg-transparent" />;
        }
        const key = getDateKey(date);
        const dayTasks = tasksByDate.get(key) ?? [];
        const visibleTasks = dayTasks.slice(0, maxVisible);
        const remainingTasks = dayTasks.length - visibleTasks.length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(key)}
            className={[
              'group relative min-h-[160px] overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-0)] p-3 text-left text-xs transition hover:border-[color:var(--accent-light)]',
              selectedDate === key ? 'border-[color:var(--accent-light)]' : '',
              key === todayKey ? 'ring-1 ring-[color:var(--accent-light)]/60' : '',
            ].join(' ')}
          >
            {onQuickAdd && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onQuickAdd(key);
                }}
                disabled={!canQuickAdd}
                className="absolute left-2 top-2 rounded-md border border-white/10 bg-[var(--surface-1)] px-2 py-0.5 text-[10px] text-[color:var(--muted)] opacity-0 transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-30"
                title={canQuickAdd ? 'Add task' : 'Admin/Attorney only'}
              >
                + Task
              </button>
            )}
            <div className="absolute right-3 top-2 text-xs text-[color:var(--muted-2)]">
              {date.getDate()}
            </div>
            <div className="space-y-1 pt-7">
              {visibleTasks.map((task) => (
                <TaskPill key={task.id} task={task} dense timeLabel={task.time_label ?? null} />
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
