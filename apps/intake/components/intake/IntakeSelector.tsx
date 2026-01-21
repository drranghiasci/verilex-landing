import React, { useState, useMemo } from 'react';
import { globalStyles } from './styles';
import DecisionTree from './DecisionTree';

export type IntakeType = 'custody_unmarried' | 'divorce_no_children' | 'divorce_with_children';

export type IntakeSettings = {
  firm_logo_url?: string | null;
  enabled_intakes?: string[];
  default_intake_type?: string | null;
  show_not_sure_option?: boolean;
  welcome_message?: string | null;
  what_to_expect_bullets?: string[] | null;
};

export type FirmInfo = {
  name?: string;
  website_url?: string | null;
};

type IntakeSelectorProps = {
  onSelect: (intakeType: IntakeType) => void;
  loading?: boolean;
  settings?: IntakeSettings;
  firm?: FirmInfo;
};

const ALL_TILES: Array<{
  id: IntakeType | 'not_sure';
  title: string;
  description: string;
  icon: string;
}> = [
    {
      id: 'custody_unmarried',
      title: 'Child Custody',
      description: 'Parents were not married, or you are not filing for divorce.',
      icon: '👨‍👩‍👧',
    },
    {
      id: 'divorce_no_children',
      title: 'Divorce',
      description: 'Ending a marriage, and no minor children are involved.',
      icon: '📋',
    },
    {
      id: 'divorce_with_children',
      title: 'Divorce with Children',
      description: 'Divorce that includes custody, parenting time, or minor children.',
      icon: '👨‍👩‍👧‍👦',
    },
    {
      id: 'not_sure',
      title: 'Not sure — help me choose',
      description: 'Answer a few quick questions and we\'ll route you to the correct intake.',
      icon: '❓',
    },
  ];

export default function IntakeSelector({
  onSelect,
  loading = false,
  settings,
  firm,
}: IntakeSelectorProps) {
  const [showDecisionTree, setShowDecisionTree] = useState(false);

  // Filter tiles based on enabled_intakes and show_not_sure_option
  const visibleTiles = useMemo(() => {
    const enabledIntakes = settings?.enabled_intakes ?? [
      'custody_unmarried',
      'divorce_no_children',
      'divorce_with_children'
    ];
    const showNotSure = settings?.show_not_sure_option ?? true;

    return ALL_TILES.filter(tile => {
      if (tile.id === 'not_sure') {
        return showNotSure;
      }
      return enabledIntakes.includes(tile.id);
    });
  }, [settings?.enabled_intakes, settings?.show_not_sure_option]);

  const handleTileClick = (id: IntakeType | 'not_sure') => {
    if (id === 'not_sure') {
      setShowDecisionTree(true);
    } else {
      onSelect(id);
    }
  };

  const handleTreeResult = (intakeType: IntakeType) => {
    onSelect(intakeType);
  };

  const handleBackToTiles = () => {
    setShowDecisionTree(false);
  };

  const welcomeMessage = settings?.welcome_message;
  const bullets = settings?.what_to_expect_bullets;
  const logoUrl = settings?.firm_logo_url;

  if (showDecisionTree) {
    return (
      <>
        <style jsx global>{globalStyles}</style>
        <DecisionTree onResult={handleTreeResult} onBack={handleBackToTiles} />
      </>
    );
  }

  return (
    <>
      <style jsx global>{globalStyles}</style>
      <div className="selector-container">
        {logoUrl && (
          <div className="firm-logo-container">
            <img src={logoUrl} alt={firm?.name ?? 'Firm logo'} className="firm-logo" />
          </div>
        )}

        <header className="selector-header">
          <h1 className="selector-title">Let's make sure we ask the right questions.</h1>
          <p className="selector-subtitle">
            Choose the option that best matches your situation. This helps us record your information accurately for the firm.
          </p>

          {welcomeMessage && (
            <p className="welcome-message">{welcomeMessage}</p>
          )}
        </header>

        {bullets && bullets.length > 0 && (
          <div className="what-to-expect">
            <h3 className="what-to-expect-title">What to expect</h3>
            <ul className="what-to-expect-list">
              {bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="tiles-grid">
          {visibleTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              className="tile"
              onClick={() => handleTileClick(tile.id)}
              disabled={loading}
            >
              <span className="tile-icon">{tile.icon}</span>
              <span className="tile-title">{tile.title}</span>
              <span className="tile-description">{tile.description}</span>
            </button>
          ))}
        </div>

        <footer className="selector-footer">
          <p>This is not legal advice.</p>
        </footer>
      </div>

      <style jsx>{`
        .selector-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          animation: fadeIn 0.5s ease-out;
        }

        .firm-logo-container {
          margin-bottom: 32px;
        }

        .firm-logo {
          max-height: 48px;
          max-width: 200px;
          object-fit: contain;
        }

        .selector-header {
          text-align: center;
          max-width: 600px;
          margin-bottom: 32px;
        }

        .selector-title {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 600;
          color: var(--text-0);
          letter-spacing: -0.02em;
          line-height: 1.3;
        }

        .selector-subtitle {
          margin-top: 16px;
          font-size: 16px;
          color: var(--text-2);
          line-height: 1.6;
        }

        .welcome-message {
          margin-top: 20px;
          font-size: 15px;
          color: var(--text-1);
          line-height: 1.6;
          padding: 16px;
          background: var(--surface-0);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .what-to-expect {
          max-width: 500px;
          width: 100%;
          margin-bottom: 32px;
          padding: 20px 24px;
          background: var(--surface-0);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .what-to-expect-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-1);
          margin-bottom: 12px;
        }

        .what-to-expect-list {
          margin: 0;
          padding: 0 0 0 20px;
          list-style: disc;
        }

        .what-to-expect-list li {
          font-size: 14px;
          color: var(--text-2);
          line-height: 1.6;
          margin-bottom: 6px;
        }

        .what-to-expect-list li:last-child {
          margin-bottom: 0;
        }

        .tiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          max-width: 800px;
          width: 100%;
        }

        .tile {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 24px;
          background: var(--surface-0);
          border: 1px solid var(--border);
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .tile:hover:not(:disabled) {
          background: var(--surface-1);
          border-color: var(--accent-light);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .tile:active:not(:disabled) {
          transform: translateY(0);
        }

        .tile:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .tile-icon {
          font-size: 32px;
          margin-bottom: 12px;
        }

        .tile-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-0);
          margin-bottom: 8px;
        }

        .tile-description {
          font-size: 14px;
          color: var(--text-2);
          line-height: 1.5;
        }

        .selector-footer {
          margin-top: 48px;
          text-align: center;
        }

        .selector-footer p {
          font-size: 12px;
          color: var(--muted-2);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 640px) {
          .tiles-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
