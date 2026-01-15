
type StepInfo = { id: string; label: string };

type IntakeHeaderProps = {
  firmName?: string;
  steps: StepInfo[];
  currentStepIndex: number;
  onToggleSidebar?: () => void;
};

export default function IntakeHeader({ firmName, steps, currentStepIndex, onToggleSidebar }: IntakeHeaderProps) {
  const displayName = firmName?.trim() || 'Verilex';

  return (
    <header className="intake-header">
      <div className="header-left">
        <span className="firm-brand">{displayName}</span>
      </div>

      <nav className="step-indicator">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <div
              key={step.id}
              className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              title={step.label}
            >
              <div className="step-number">
                {isCompleted ? (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {isActive && <span className="step-label">{step.label}</span>}
            </div>
          );
        })}
      </nav>

      <div className="header-right">
        {onToggleSidebar && (
          <button className="sidebar-toggle" onClick={onToggleSidebar}>
            <span>Case Details</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
      </div>

      <style jsx>{`
        /* ... existing styles ... */
        
        .sidebar-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 6px 12px;
          color: var(--text-2);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sidebar-toggle:hover {
          background: var(--surface-2);
          color: var(--text-0);
          border-color: var(--border-highlight);
        }
        .intake-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 60px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: rgba(10, 10, 10, 0.6);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .firm-brand {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
          letter-spacing: -0.01em;
        }

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-2);
          transition: all 0.2s;
        }

        .step-item.active {
          color: var(--text-0);
        }

        .step-number {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 1px solid var(--border-highlight);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .step-item.active .step-number {
          background: var(--text-0);
          color: var(--bg);
          border-color: var(--text-0);
        }

        .step-item.completed .step-number {
          background: var(--surface-2);
          border-color: transparent;
          color: var(--success);
        }

        .step-label {
          font-size: 13px;
          font-weight: 500;
          animation: slideRight 0.2s ease-out;
        }

        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </header>
  );
}

