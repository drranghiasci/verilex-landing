import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import IntakeFlow from '../../../components/intake/IntakeFlow';
import IntakeLanding from '../../../components/intake/IntakeLanding';
import IntakeSelector from '../../../components/intake/IntakeSelector';
import type { IntakeType, IntakeSettings, FirmInfo } from '../../../components/intake/IntakeSelector';
import { ThemeProvider } from '../../../components/ThemeProvider';
import type { AccentPreset, ThemeMode } from '../../../lib/themePresets';
import { loadIntake, selectIntakeType } from '../../../../../lib/intake/intakeApi';
import { globalStyles } from '../../../components/intake/styles';

type FlowPhase = 'landing' | 'loading' | 'selector' | 'chat';

type FirmConfig = {
  firm: FirmInfo & { id: string };
  intake_settings: IntakeSettings & {
    brand_accent_preset?: string;
    brand_theme_default?: string;
  };
};

export default function IntakeStartPage() {
  const router = useRouter();
  const firmSlug = typeof router.query.firm_slug === 'string' ? router.query.firm_slug : 'intake';
  const initialToken = typeof router.query.token === 'string' ? router.query.token : undefined;
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [phase, setPhase] = useState<FlowPhase>('loading');
  const [selectLoading, setSelectLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'in_progress' | 'ready_for_review' | 'submitted' | null>(null);
  const [firmConfig, setFirmConfig] = useState<FirmConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Determine active token
  const activeToken = initialToken ?? resumeToken ?? undefined;

  // Fetch firm config on mount
  useEffect(() => {
    if (!router.isReady) return;

    async function loadFirmConfig() {
      try {
        const res = await fetch(`/api/intake/firm-config?slug=${encodeURIComponent(firmSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.firm) {
            setFirmConfig({
              firm: data.firm,
              intake_settings: data.intake_settings,
            });
          }
        }
      } catch (err) {
        console.error('Failed to load firm config:', err);
        // Continue with defaults
      } finally {
        setConfigLoaded(true);
      }
    }

    loadFirmConfig();
  }, [firmSlug, router.isReady]);

  // On mount: check for stored token and determine phase
  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined' || !configLoaded) return;

    const forceNew = router.query.new === '1' || router.query.new === 'true';
    const storageKey = `intake:token:${firmSlug}`;

    if (forceNew) {
      window.localStorage.removeItem(storageKey);
      setResumeToken(null);
      setPhase('landing');
      return;
    }

    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      setResumeToken(stored);
    } else {
      setPhase('landing');
    }
  }, [firmSlug, router.isReady, router.query.new, configLoaded]);

  // When we have a token, load intake to check phase
  useEffect(() => {
    if (!activeToken || phase === 'landing') return;

    async function checkIntakeState() {
      try {
        const result = await loadIntake({ token: activeToken! });
        const intakeType = result.intake?.intake_type;

        if (intakeType) {
          // Has intake_type set → go to chat
          setPhase('chat');
        } else {
          // No intake_type → show selector
          setPhase('selector');
        }
      } catch (err) {
        console.error('Failed to load intake:', err);
        // Token might be invalid, go to landing
        const storageKey = `intake:token:${firmSlug}`;
        window.localStorage.removeItem(storageKey);
        setResumeToken(null);
        setPhase('landing');
      }
    }

    checkIntakeState();
  }, [activeToken, firmSlug, phase]);

  // Handle start from landing
  const handleStart = useCallback((token: string) => {
    const storageKey = `intake:token:${firmSlug}`;
    window.localStorage.setItem(storageKey, token);
    setResumeToken(token);
    setPhase('selector');
  }, [firmSlug]);

  // Handle intake type selection
  const handleSelectType = useCallback(async (intakeType: IntakeType) => {
    if (!activeToken) return;

    setSelectLoading(true);
    setError(null);

    try {
      await selectIntakeType({
        token: activeToken,
        intake_type: intakeType,
      });
      setPhase('chat');
    } catch (err) {
      console.error('Failed to select intake type:', err);
      setError('Unable to set intake type. Please try again.');
    } finally {
      setSelectLoading(false);
    }
  }, [activeToken]);

  // Extract theme settings
  const accentPreset = (firmConfig?.intake_settings?.brand_accent_preset ?? 'verilex_default') as AccentPreset;
  const themeDefault = (firmConfig?.intake_settings?.brand_theme_default ?? 'system') as ThemeMode;

  // Show loading until config is loaded
  if (!configLoaded) {
    return (
      <>
        <style jsx global>{globalStyles}</style>
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid var(--border);
            border-top-color: var(--accent);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </>
    );
  }

  // Wrap content with ThemeProvider
  return (
    <ThemeProvider defaultTheme={themeDefault} accentPreset={accentPreset}>
      {/* Landing Phase (No token) */}
      {phase === 'landing' && (
        <IntakeLanding
          firmSlug={firmSlug}
          firmName={firmConfig?.firm?.name}
          onStart={handleStart}
        />
      )}

      {/* Loading Phase */}
      {phase === 'loading' && (
        <>
          <style jsx global>{globalStyles}</style>
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading intake...</p>
          </div>
          <style jsx>{`
            .loading-container {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 16px;
              color: var(--text-2);
            }
            .loading-spinner {
              width: 32px;
              height: 32px;
              border: 2px solid var(--border);
              border-top-color: var(--accent);
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}

      {/* Selector Phase (Token exists, no intake_type) */}
      {phase === 'selector' && (
        <>
          <IntakeSelector
            onSelect={handleSelectType}
            loading={selectLoading}
            settings={firmConfig?.intake_settings}
            firm={firmConfig?.firm}
          />
          {error && (
            <div className="error-toast">
              {error}
              <button type="button" onClick={() => setError(null)}>×</button>
            </div>
          )}
          <style jsx>{`
            .error-toast {
              position: fixed;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              background: var(--danger);
              color: white;
              padding: 12px 20px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 14px;
              z-index: 1000;
            }
            .error-toast button {
              background: transparent;
              border: none;
              color: white;
              font-size: 18px;
              cursor: pointer;
              padding: 0 4px;
            }
          `}</style>
        </>
      )}

      {/* Chat Phase (Token + intake_type set) */}
      {phase === 'chat' && (
        <IntakeFlow
          firmSlug={firmSlug}
          mode="resume"
          initialToken={activeToken}
          onStatusChange={setStatus}
        />
      )}
    </ThemeProvider>
  );
}
