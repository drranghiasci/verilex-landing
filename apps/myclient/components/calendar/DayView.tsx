import TaskPill, { CalendarTask } from './TaskPill';

type DayViewProps = {
  dateKey: string;
  tasks: CalendarTask[];
};

export default function DayView({ dateKey, tasks }: DayViewProps) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-white">
        {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </h2>
      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No tasks for this day.</p>
        ) : (
          tasks.map((task) => <TaskPill key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}
