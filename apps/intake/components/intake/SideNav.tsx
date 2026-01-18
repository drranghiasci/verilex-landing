import { useState } from 'react';

type StepInfo = {
    id: string;
    label: string;
    isCompleted: boolean;
    isActive: boolean;
};

type SideNavProps = {
    steps: StepInfo[];
    currentStepIndex: number;
    completionPercentage: number;
    onStepClick?: (stepIndex: number) => void;
};

export default function SideNav({ steps, currentStepIndex, completionPercentage, onStepClick }: SideNavProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <aside
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
            className={[
                'fixed left-0 top-16 z-40 h-[calc(100vh-64px)]',
                'border-r border-[color:var(--border)] bg-[rgba(10,10,12,0.92)] backdrop-blur',
                'transition-all duration-200 ease-out',
                expanded ? 'w-56' : 'w-16',
            ].join(' ')}
        >
            <div className="flex h-full flex-col px-3 py-6">
                {/* Pipeline Progress Rail */}
                <nav className="flex flex-1 flex-col">
                    {steps.map((step, index) => {
                        const isCompleted = step.isCompleted;
                        const isActive = step.isActive;
                        const isFuture = !isCompleted && !isActive;
                        const isLast = index === steps.length - 1;

                        return (
                            <div key={step.id} className="relative flex items-start">
                                {/* Vertical Pipe (connector to next step) */}
                                {!isLast && (
                                    <div
                                        className={[
                                            'absolute left-[31px] top-10 h-8 w-0.5',
                                            index < currentStepIndex
                                                ? 'bg-[color:var(--accent)]'
                                                : 'bg-[color:var(--border)] border-dashed',
                                        ].join(' ')}
                                    />
                                )}

                                {/* Step Bubble + Label Row */}
                                <button
                                    type="button"
                                    onClick={() => onStepClick?.(index)}
                                    disabled={isFuture}
                                    className={[
                                        'relative flex items-center gap-3 rounded-xl px-3 py-2 w-full text-left transition-all duration-200',
                                        'mb-4',
                                        isActive
                                            ? 'text-white'
                                            : isCompleted
                                                ? 'text-[color:var(--text-1)] hover:text-white'
                                                : 'text-[color:var(--muted)] cursor-not-allowed',
                                    ].join(' ')}
                                >
                                    {/* Active Indicator Bar */}
                                    <span
                                        className={[
                                            'absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[color:var(--accent)] transition-opacity',
                                            isActive ? 'opacity-100' : 'opacity-0',
                                        ].join(' ')}
                                    />

                                    {/* Pipeline Bubble */}
                                    <span
                                        className={[
                                            'relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                                            isActive
                                                ? 'bg-[color:var(--accent)] text-white ring-4 ring-[color:var(--accent)]/20'
                                                : isCompleted
                                                    ? 'bg-[color:var(--accent-light)] text-white'
                                                    : 'bg-[var(--surface-1)] border-2 border-[color:var(--border)] text-[color:var(--muted)]',
                                        ].join(' ')}
                                    >
                                        {isCompleted ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>

                                    {/* Label (shown when expanded) */}
                                    <span
                                        className={[
                                            'whitespace-nowrap text-sm font-medium transition-all duration-200',
                                            expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden',
                                        ].join(' ')}
                                    >
                                        {step.label}
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </nav>

                {/* Progress Percentage (shown when expanded) */}
                <div
                    className={[
                        'mt-auto pt-4 border-t border-[color:var(--border)] transition-opacity duration-200',
                        expanded ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}
                >
                    <div className="text-xs text-[color:var(--muted)] text-center">
                        {Math.round(completionPercentage)}% complete
                    </div>
                </div>
            </div>
        </aside>
    );
}
