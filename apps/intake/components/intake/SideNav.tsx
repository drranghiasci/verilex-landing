import { useState } from 'react';

// Constants for consistent sizing in collapsed/expanded states
const BUBBLE_SIZE = 32; // px (h-8 w-8)
const PIPE_WIDTH = 2; // px (w-0.5)
const STEP_GAP = 8; // px vertical gap between steps
const PIPELINE_COLUMN_WIDTH = 56; // px - fixed width for bubble + centering padding
const SIDEBAR_COLLAPSED_WIDTH = 64; // px (w-16)
const SIDEBAR_EXPANDED_WIDTH = 224; // px (w-56)

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
                'border-r border-[color:var(--border)] bg-[var(--sidebar-bg)] backdrop-blur',
                'transition-all duration-200 ease-out overflow-hidden',
            ].join(' ')}
            style={{ width: expanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
        >
            <div className="flex h-full flex-col py-6">
                {/* Pipeline Progress Rail */}
                <nav className="flex flex-1 flex-col">
                    {steps.map((step, index) => {
                        const isCompleted = step.isCompleted;
                        const isActive = step.isActive;
                        const isFuture = !isCompleted && !isActive;
                        const isLast = index === steps.length - 1;

                        return (
                            <div key={step.id} className="relative flex" style={{ minHeight: BUBBLE_SIZE + STEP_GAP }}>
                                {/* Column 1: Pipeline (bubble + pipe) - Fixed width, always centered */}
                                <div
                                    className="flex-shrink-0 flex flex-col items-center relative"
                                    style={{ width: PIPELINE_COLUMN_WIDTH }}
                                >
                                    {/* Vertical Pipe (connector to next step) */}
                                    {!isLast && (
                                        <div
                                            className={[
                                                'absolute top-8 left-1/2 -translate-x-1/2',
                                                index < currentStepIndex
                                                    ? 'bg-[color:var(--accent)]'
                                                    : 'bg-[color:var(--border)]',
                                            ].join(' ')}
                                            style={{
                                                width: PIPE_WIDTH,
                                                height: STEP_GAP + 8, // connects to next bubble
                                            }}
                                        />
                                    )}

                                    {/* Pipeline Bubble */}
                                    <button
                                        type="button"
                                        onClick={() => onStepClick?.(index)}
                                        disabled={isFuture}
                                        className={[
                                            'relative flex items-center justify-center rounded-full text-xs font-bold transition-all',
                                            'focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]/50',
                                            isActive
                                                ? 'bg-[color:var(--accent)] text-white ring-4 ring-[color:var(--accent)]/20'
                                                : isCompleted
                                                    ? 'bg-[color:var(--accent-light)] text-white hover:ring-2 hover:ring-[color:var(--accent)]/30'
                                                    : 'bg-[var(--surface-1)] border-2 border-[color:var(--border)] text-[color:var(--muted)] cursor-not-allowed',
                                        ].join(' ')}
                                        style={{ width: BUBBLE_SIZE, height: BUBBLE_SIZE }}
                                        title={!expanded ? step.label : undefined}
                                    >
                                        {isCompleted ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : (
                                            index + 1
                                        )}
                                    </button>
                                </div>

                                {/* Column 2: Label - Only visible when expanded */}
                                <div
                                    className={[
                                        'flex items-center min-h-[32px] overflow-hidden transition-all duration-200',
                                        expanded ? 'opacity-100' : 'opacity-0 w-0',
                                    ].join(' ')}
                                >
                                    <span
                                        className={[
                                            'whitespace-nowrap text-sm font-medium pl-2',
                                            isActive
                                                ? 'text-white'
                                                : isCompleted
                                                    ? 'text-[color:var(--text-1)]'
                                                    : 'text-[color:var(--muted)]',
                                        ].join(' ')}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* Progress Percentage (shown when expanded) */}
                <div
                    className={[
                        'mx-4 pt-4 border-t border-[color:var(--border)] transition-opacity duration-200',
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
