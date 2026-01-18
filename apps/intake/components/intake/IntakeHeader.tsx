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
      <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-[color:var(--border)] bg-[rgba(10,10,12,0.88)] backdrop-blur">
        <div className="flex h-full items-center justify-between px-3">
          {/* Left: VeriLex Logo - links to verilex.us */}
          <div className="flex items-center">
            <a
              href="https://verilex.us"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <img src={logoSrc} alt="VeriLex" width={140} height={36} className="object-contain" />
            </a>
          </div>

          {/* Right: Theme Toggle + Firm Name */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {firmWebsiteUrl ? (
              <button
                onClick={handleFirmClick}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[color:var(--text-1)] transition hover:bg-white/10 hover:text-white"
              >
                {displayName}
              </button>
            ) : (
              <span className="text-sm font-medium text-[color:var(--text-1)]">
                {displayName}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Leave Page Warning Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 text-center shadow-2xl">
            <h2 className="text-lg font-semibold text-[color:var(--text-0)]">
              Leave this intake page?
            </h2>
            <p className="mt-3 text-sm text-[color:var(--text-2)]">
              You're about to visit the firm's website. Your progress may not be saved.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-medium text-[color:var(--text-1)] transition hover:bg-white/5"
              >
                Stay here
              </button>
              <button
                onClick={handleContinueToWebsite}
                className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Continue to website
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
