import Link from 'next/link';
import type { CaseTaskRow } from '@/types/tasks';

export type CalendarTask = CaseTaskRow & {
  case_id: string;
  title: string;
  due_date: string;
  ribbon_color?: string | null;
};

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

type TaskPillProps = {
  task: CalendarTask;
  dense?: boolean;
};

export default function TaskPill({ task, dense }: TaskPillProps) {
  const ribbonClass = task.ribbon_color ? `border-l-4 ${getRibbonClass(task.ribbon_color)} pl-1.5` : '';
  const heightClass = dense ? 'h-6 text-[11px]' : 'h-7 text-xs';

  return (
    <Link
      href={`/myclient/cases/${task.case_id}`}
      className={`flex items-center truncate rounded-md border border-white/10 bg-[var(--surface-1)] px-2 ${heightClass} text-[color:var(--text)] hover:text-white ${ribbonClass}`}
    >
      {task.title}
    </Link>
  );
}
