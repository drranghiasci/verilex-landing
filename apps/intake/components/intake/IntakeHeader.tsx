'use client';

import { useState } from 'react';
import { useTheme } from '../../lib/theme-context';
import ThemeToggle from '../ThemeToggle';

type IntakeHeaderProps = {
  firmName?: string;
  firmWebsiteUrl?: string;
};

export default function IntakeHeader({ firmName, firmWebsiteUrl }: IntakeHeaderProps) {
  const { theme } = useTheme();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const displayName = firmName?.trim() || 'VeriLex';

  const logoSrc = theme === 'dark'
    ? '/verilex-logo-name-darkmode.svg'
    : '/verilex-logo-name-lightmode.svg';

  const handleFirmClick = () => {
    if (firmWebsiteUrl) {
      setShowLeaveModal(true);
    }
  };

  const handleContinueToWebsite = () => {
    if (firmWebsiteUrl) {
      window.open(firmWebsiteUrl, '_blank', 'noopener,noreferrer');
    }
    setShowLeaveModal(false);
  };

  return (
    <>
      <header className="intake-header">
        <div className="header-left">
          <img src={logoSrc} alt="VeriLex" className="logo" />
        </div>

        <div className="header-right">
          <ThemeToggle />
          {firmWebsiteUrl ? (
            <button className="firm-link" onClick={handleFirmClick}>
              {displayName}
            </button>
          ) : (
            <span className="firm-name">{displayName}</span>
          )}
        </div>

        <style jsx>{`
          .intake-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            height: 56px;
            padding: 0 24px;
            border-bottom: 1px solid var(--border);
            background: var(--surface-0);
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .header-left {
            display: flex;
            align-items: center;
          }

          .logo {
            height: 24px;
            width: auto;
          }

          .header-right {
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .firm-link {
            background: transparent;
            border: none;
            color: var(--text-1);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.2s;
          }

          .firm-link:hover {
            background: var(--surface-2);
            color: var(--text-0);
          }

          .firm-name {
            color: var(--text-1);
            font-size: 14px;
            font-weight: 500;
          }

          @media (max-width: 768px) {
            .intake-header {
              padding: 0 16px;
            }
            .logo {
              height: 20px;
            }
          }
        `}</style>
      </header>

      {/* Leave Page Warning Modal */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Leave this intake page?</h2>
            <p>You're about to visit the firm's website. Your progress may not be saved.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLeaveModal(false)}>
                Stay here
              </button>
              <button className="btn-primary" onClick={handleContinueToWebsite}>
                Continue to website
              </button>
            </div>
          </div>

          <style jsx>{`
            .modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.7);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              backdrop-filter: blur(4px);
            }

            .modal-content {
              background: var(--surface-1);
              border: 1px solid var(--border);
              border-radius: 12px;
              padding: 32px;
              max-width: 400px;
              width: 90%;
              text-align: center;
            }

            .modal-content h2 {
              font-size: 18px;
              font-weight: 600;
              color: var(--text-0);
              margin-bottom: 12px;
            }

            .modal-content p {
              font-size: 14px;
              color: var(--text-2);
              margin-bottom: 24px;
              line-height: 1.5;
            }

            .modal-actions {
              display: flex;
              gap: 12px;
              justify-content: center;
            }

            .btn-secondary {
              padding: 10px 20px;
              border-radius: 8px;
              background: transparent;
              border: 1px solid var(--border);
              color: var(--text-1);
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }

            .btn-secondary:hover {
              background: var(--surface-2);
            }

            .btn-primary {
              padding: 10px 20px;
              border-radius: 8px;
              background: var(--accent);
              border: none;
              color: white;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            }

            .btn-primary:hover {
              opacity: 0.9;
            }
          `}</style>
        </div>
      )}
    </>
  );
}
