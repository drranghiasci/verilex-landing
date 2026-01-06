type CalendarView = 'month' | 'week' | 'day' | 'agenda';

type CalendarViewToggleProps = {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
};

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' },
];

export default function CalendarViewToggle({ value, onChange }: CalendarViewToggleProps) {
  return (
    <div className="flex items-center rounded-full border border-[color:var(--border)] bg-[var(--surface-1)] p-1 text-xs">
      {VIEWS.map((view) => (
        <button
          key={view.value}
          type="button"
          onClick={() => onChange(view.value)}
          className={[
            'rounded-full px-3 py-1.5 transition',
            value === view.value
              ? 'bg-[color:var(--accent-light)] text-white'
              : 'text-[color:var(--muted)] hover:text-white',
          ].join(' ')}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
