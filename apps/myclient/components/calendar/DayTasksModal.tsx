import Link from 'next/link';
import { X } from 'lucide-react';
import TaskPill, { CalendarTask } from './TaskPill';

type DayTasksModalProps = {
  open: boolean;
  dateLabel: string;
  tasks: CalendarTask[];
  timezone: string;
  onClose: () => void;
};

export default function DayTasksModal({ open, dateLabel, tasks, timezone, onClose }: DayTasksModalProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close day tasks"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
      />
      <aside className="fixed right-0 top-16 z-50 h-[calc(100vh-64px)] w-full max-w-[420px] border-l border-[color:var(--border)] bg-[var(--surface-0)] shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Tasks</h2>
              <p className="text-xs text-[color:var(--muted)]">{dateLabel}</p>
            </div>
            <button
              type="button"
              aria-label="Close day tasks"
              onClick={onClose}
              className="rounded-lg border border-[color:var(--border)] p-1.5 text-[color:var(--muted)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            {tasks.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">No tasks for this day.</p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] p-3">
                    <TaskPill task={task} timeLabel={task.time_label ?? null} />
                    <div className="mt-2 flex items-center justify-between text-xs text-[color:var(--muted-2)]">
                      <span>
                        Due{' '}
                        {new Date(`${task.due_date}T00:00:00`).toLocaleDateString(undefined, {
                          timeZone: timezone,
                        })}
                      </span>
                      <Link href={`/myclient/cases/${task.case_id}`} className="hover:text-white">
                        View case
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
