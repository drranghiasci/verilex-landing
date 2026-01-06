import TaskPill, { CalendarTask } from './TaskPill';

type AgendaViewProps = {
  tasks: CalendarTask[];
};

export default function AgendaView({ tasks }: AgendaViewProps) {
  const grouped = tasks.reduce<Record<string, CalendarTask[]>>((acc, task) => {
    const key = task.due_date;
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (dates.length === 0) {
    return <p className="text-sm text-[color:var(--muted)]">No tasks scheduled.</p>;
  }

  return (
    <div className="space-y-5">
      {dates.map((dateKey) => (
        <div key={dateKey} className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-white">
            {new Date(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h3>
          <div className="mt-3 space-y-2">
            {grouped[dateKey].map((task) => (
              <TaskPill key={task.id} task={task} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
