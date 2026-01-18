import { useTheme } from '../../lib/theme-context';
import ThemeToggle from '../ThemeToggle';

type StepInfo = { id: string; label: string };

type IntakeHeaderProps = {
  firmName?: string;
  steps: StepInfo[];
  currentStepIndex: number;
  onToggleSidebar?: () => void;
};

export default function IntakeHeader({ firmName, steps, currentStepIndex, onToggleSidebar }: IntakeHeaderProps) {
  const { theme } = useTheme();
  const displayName = firmName?.trim() || 'VeriLex';

  const logoSrc = theme === 'dark'
    ? '/verilex-logo-name-darkmode.svg'
    : '/verilex-logo-name-lightmode.svg';

  return (
    <header className="intake-header">
      <div className="header-left">
        <img src={logoSrc} alt="VeriLex" className="logo" />
        <span className="firm-divider">|</span>
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
              <span className="step-label">{step.label}</span>
            </div>
          );
        })}
      </nav>

      <div className="header-right">
        <ThemeToggle />
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
        .intake-header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          height: 60px;
          padding: 0 24px;
          border-bottom: 1px solid var(--border);
          background: var(--surface-0);
          backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-left {
          justify-self: start;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          height: 28px;
          width: auto;
        }

        .firm-divider {
          color: var(--border);
          font-weight: 300;
        }

        .firm-brand {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-1);
        }

        .header-right {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 12px;
        }

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

        .step-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          justify-self: center;
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
          color: var(--text-2);
        }
        
        .step-item.active .step-label {
          color: var(--text-0);
        }

        @media (max-width: 768px) {
          .intake-header {
            grid-template-columns: auto 1fr auto;
            padding: 0 16px;
          }
          
          .step-indicator {
            display: none;
          }

          .firm-brand {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      `}</style>
    </header>
  );
}
