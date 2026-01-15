import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { intakeSteps } from './steps';
import WarningsPanel from './WarningsPanel';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import LockedConfirmation from './LockedConfirmation';
import ErrorBanner from './ErrorBanner';
import GuidedChatPanel from './GuidedChatPanel';
import SafetyBanner from './SafetyBanner';
import IntakeHeader from './IntakeHeader';
import IntakeSidebar from './IntakeSidebar';
import { useIntakeSession } from './useIntakeSession';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { runConsistencyChecks } from '../../../../lib/intake/consistencyChecks';
import type { ResolveFirmResponse } from '../../../../lib/intake/intakeApi';
import { intakeSections, validate, validateIntakePayload } from '../../../../lib/intake/validation';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../lib/intake/schema/gaDivorceCustodyV1';
import {
  getCountyWarnings,
  getEnabledSectionIds,
  getSafetyBanners,
  getSectionContextNote,
  getSectionTitleForMatterType,
} from '../../../../lib/intake/gating';
import { GUIDED_PROMPT_LIBRARY } from '../../../../lib/intake/guidedChat/promptLibrary';
import { missingFieldsForSection } from '../../../../lib/intake/guidedChat/missingFields';
import { globalStyles } from './styles';
import IntakeReview from './IntakeReview'; // Import the new component

const fieldToSectionId = new Map<string, string>();
for (const section of intakeSections) {
  for (const field of section.fields) {
    fieldToSectionId.set(field.key, section.id);
  }
}

type IntakeFlowProps = {
  firmSlug: string;
  mode: 'new' | 'resume';
  initialToken?: string;
  onStatusChange?: (status: 'draft' | 'in_progress' | 'ready_for_review' | 'submitted' | null) => void;
  onFirmResolved?: (firm: ResolveFirmResponse | null) => void;
};

export default function IntakeFlow({
  firmSlug,
  mode,
  initialToken,
  onStatusChange,
  onFirmResolved,
}: IntakeFlowProps) {
  const router = useRouter();
  const [uiError, setUiError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const safetyLoggedRef = useRef<Set<string>>(new Set());

  const {
    token,
    setToken,
    firm,
    intake,
    payload,
    messages,
    documents,
    locked,
    loading,
    error,
    start,
    load,
    submit,
    updateField,
    queueMessages,
    flushPending,
  } = useIntakeSession({
    firmSlug,
    token: initialToken,
    currentStepId: String(currentStepIndex),
  });

  const matterType = payload.matter_type;
  const enabledSectionIds = useMemo(() => getEnabledSectionIds(payload), [payload]);
  const visibleSteps = useMemo(
    () => intakeSteps.filter((stepItem) => enabledSectionIds.has(stepItem.id)),
    [enabledSectionIds],
  );
  const stepIndexById = useMemo(() => {
    const map = new Map<string, number>();
    visibleSteps.forEach((stepItem, index) => {
      map.set(stepItem.id, index);
    });
    return map;
  }, [visibleSteps]);

  const step = visibleSteps[currentStepIndex] ?? visibleSteps[0];

  const intakeId = intake?.id ?? null;
  const status = intake?.status ?? null;
  const submittedAt = intake?.submitted_at ?? null;
  const isLocked = locked || status === 'submitted' || Boolean(submittedAt);

  const missingFields = useMemo(
    () => (step ? missingFieldsForSection(payload, GA_DIVORCE_CUSTODY_V1, step.id) : []),
    [payload, step],
  );

  const validation = useMemo(
    () => validateIntakePayload(payload, enabledSectionIds),
    [payload, enabledSectionIds],
  );
  const validationSummary = useMemo(
    () => validate(payload, undefined, enabledSectionIds),
    [payload, enabledSectionIds],
  );
  const hasMissingRequired = validationSummary.missingRequiredPaths.length > 0;
  const shouldShowMissingIndicators = showRequiredErrors;
  const missingBySection = shouldShowMissingIndicators ? validation.missingBySection : {};
  const consistency = useMemo(() => runConsistencyChecks(payload), [payload]);
  const countyWarnings = useMemo(() => getCountyWarnings(payload), [payload]);
  const safetyBanners = useMemo(() => getSafetyBanners(payload), [payload]);
  const [dismissedBanners, setDismissedBanners] = useState<Record<string, boolean>>({});
  const activeBanners = safetyBanners.filter((banner) => !dismissedBanners[banner.key]);

  const getSafetyMessage = (key: string) => {
    if (key === 'immediate_safety') {
      return 'Safety resources banner displayed (immediate_safety_concerns=true).';
    }
    if (key === 'dv_present') {
      return 'Safety resources banner displayed (dv_present=true).';
    }
    return `Safety resources banner displayed (${key}).`;
  };

  const allWarnings = useMemo(
    () => [...consistency.warnings, ...countyWarnings],
    [consistency.warnings, countyWarnings],
  );
  const warningItems = useMemo(
    () =>
      allWarnings
        .map((warning) => {
          const sectionIds = warning.paths
            .map((path) => fieldToSectionId.get(path))
            .filter((value): value is string => Boolean(value));
          const uniqueSectionIds = Array.from(new Set(sectionIds));
          return {
            warning,
            sections: uniqueSectionIds.map((id) => ({
              id,
              title: getSectionTitleForMatterType(id, matterType),
            })),
          };
        })
        .filter((item) => {
          if (!item.sections || item.sections.length === 0) return true;
          return item.sections.some((section) => enabledSectionIds.has(section.id));
        }),
    [allWarnings, enabledSectionIds, matterType],
  );

  const validationIssues = useMemo(() => {
    return validationSummary.missingRequiredPaths.map((path) => {
      const key = path.split('[')[0];
      const sectionId = fieldToSectionId.get(key);
      const sectionTitle = sectionId ? getSectionTitleForMatterType(sectionId, matterType) : undefined;
      const message = validationSummary.errorsByPath[path]?.[0] ?? 'Required field missing.';
      return { path, message, sectionId, sectionTitle };
    });
  }, [matterType, validationSummary]);

  useEffect(() => {
    if (!initialToken) return;
    if (initialToken !== token) {
      setToken(initialToken);
    }
  }, [initialToken, setToken, token]);

  useEffect(() => {
    if (mode !== 'resume') return;
    setHasLoaded(false);
  }, [mode, token]);

  useEffect(() => {
    if (!onStatusChange) return;
    onStatusChange(status ?? null);
  }, [onStatusChange, status]);

  useEffect(() => {
    if (!onFirmResolved) return;
    onFirmResolved(firm ?? null);
  }, [firm, onFirmResolved]);

  useEffect(() => {
    if (!token || !intakeId) return;
    if (isLocked) return;
    if (activeBanners.length === 0) return;

    const existingMessages = new Set(
      messages
        .filter((message) => message.source === 'system' && message.channel === 'chat')
        .map((message) => message.content),
    );
    const newMessages = activeBanners
      .map((banner) => ({
        banner,
        content: getSafetyMessage(banner.key),
      }))
      .filter(({ banner, content }) => {
        if (existingMessages.has(content)) return false;
        if (safetyLoggedRef.current.has(banner.key)) return false;
        safetyLoggedRef.current.add(banner.key);
        return true;
      })
      .map(({ content }) => ({ source: 'system', channel: 'chat', content }));

    if (newMessages.length === 0) return;
    queueMessages(newMessages);
    void flushPending();
  }, [activeBanners, flushPending, intakeId, isLocked, messages, queueMessages, token]);

  useEffect(() => {
    if (!visibleSteps.length) return;
    const currentId = step?.id;
    const nextIndex = currentId ? visibleSteps.findIndex((item) => item.id === currentId) : -1;
    if (nextIndex === -1 && currentStepIndex !== 0) {
      setCurrentStepIndex(0);
      return;
    }
    if (nextIndex > -1 && nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);
    }
  }, [currentStepIndex, step?.id, visibleSteps]);

  // Auto-Advance Effect
  useEffect(() => {
    // blocked by global missing requirements? No, only check current step.
    if (isLocked || loading) return;
    // Allow advancing if NO missing fields, even on the last step (to trigger Review transition)
    if (missingFields.length === 0) {
      const timer = setTimeout(() => {
        handleSaveStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [missingFields.length, isLocked, loading, currentStepIndex, visibleSteps.length]);

  useEffect(() => {
    if (mode !== 'resume' || !token || hasLoaded) return;
    setUiError(null);
    void load(token).then((result) => {
      if (result) setHasLoaded(true);
    });
  }, [hasLoaded, load, mode, token]);

  useEffect(() => {
    if (intakeId) setHasLoaded(true);
  }, [intakeId]);

  useEffect(() => {
    if (intakeId) setShowRequiredErrors(false);
  }, [intakeId]);

  const sectionMissing = new Set(missingBySection[step?.id ?? ''] ?? []);
  const inlineWarnings = warningItems.filter((item) =>
    item.sections?.some((section) => section.id === step?.id),
  );
  const sectionContextNote = step ? getSectionContextNote(step.id, matterType) : null;
  const sectionTitleOverride = step ? getSectionTitleForMatterType(step.id, matterType) : undefined;

  const handleSaveStep = async () => {
    if (isLocked) return;
    setUiError(null);
    const result = await flushPending();
    if (result.locked) {
      setUiError('Intake is locked.');
      return;
    }

    // Check if we are at the last step
    if (currentStepIndex === visibleSteps.length - 1) {
      // We are done. Transition to Review.
      try {
        const res = await fetch('/api/intake/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, status: 'ready_for_review' })
        });
        if (!res.ok) throw new Error('Failed to update status');
        await load(token!); // Reload (triggers view change)
      } catch (err) {
        console.error(err);
        setUiError('Unable to proceed to review.');
      }
      return;
    }

    // Otherwise, advance
    setCurrentStepIndex((prev) => Math.min(prev + 1, visibleSteps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAppendChatMessage = async (prompt: string, response: string) => {
    if (!token || !intakeId) return { ok: false };
    if (isLocked) return { ok: false, locked: true };
    setUiError(null);
    queueMessages([
      { source: 'system', channel: 'chat', content: prompt },
      { source: 'client', channel: 'chat', content: response },
    ]);
    const result = await flushPending();
    if (!result.ok && result.locked) {
      setUiError('Intake is locked.');
    } else if (!result.ok) {
      setUiError('Unable to save message.');
    }
    return result;
  };

  const handleSubmit = async () => {
    if (!token || !intakeId) return;
    if (!confirmFinal) {
      setUiError('Please confirm that submission is final.');
      return;
    }
    if (hasMissingRequired) {
      setUiError(null);
      setShowRequiredErrors(true);
      return;
    }

    setUiError(null);
    await flushPending();
    await submit();
  };

  useEffect(() => {
    if (currentStepIndex !== visibleSteps.length - 1 && confirmFinal) {
      setConfirmFinal(false);
    }
  }, [confirmFinal, currentStepIndex, visibleSteps.length]);

  useEffect(() => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setShowRequiredErrors(true);
    }
  }, [currentStepIndex, visibleSteps.length]);

  const renderAccessGate = () => {
    if (!token && mode === 'resume') {
      return (
        <Card>
          <h2>Enter intake token</h2>
          <p className="muted">Use the secure token provided by the firm.</p>
          <Input
            type="text"
            value={token}
            onChange={(event) => setToken(event.target.value.trim())}
            placeholder="Token"
          />
        </Card>
      );
    }

    if (!intakeId && mode === 'new') {
      return (
        <Card>
          <h2>Start your intake</h2>
          <p className="muted">Firm: {firmSlug}</p>
          <Button
            variant="primary"
            onClick={async () => {
              setUiError(null);
              await start();
            }}
            disabled={loading}
          >
            {loading ? 'Starting...' : 'Start intake'}
          </Button>
        </Card>
      );
    }

    if (!intakeId && mode === 'resume') {
      return (
        <Card>
          <h2>Resume your intake</h2>
          <p className="muted">We can recover your draft with your secure token.</p>
          <Button
            variant="primary"
            onClick={() => {
              setUiError(null);
              void load(token);
            }}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load intake'}
          </Button>
        </Card>
      );
    }
    return null;
  };

  // New Layout Logic
  const displayError = uiError ?? error?.message ?? null;
  const requestId = error?.requestId ?? null;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const stepsInfo = visibleSteps.map((s) => ({
    id: s.id,
    label: getSectionTitleForMatterType(s.id, matterType),
  }));

  if (!intakeId) {
    return (
      <div className="flow">
        <style jsx global>{globalStyles}</style>
        <ErrorBanner message={displayError} requestId={requestId} />
        {renderAccessGate()}
      </div>
    );
  }

  // 7. Render
  // If not started yet
  if (!intakeId) {
    // This case is actually handled above by renderAccessGate and the early return
    // But if we want to use IntakeLanding (prettier start screen), we can do it here
    // However, the current logic above (lines 398-406) renders renderAccessGate()
    // Let's stick to the existing pattern or if you want to replace it:

    // We already return above if !intakeId. 
    // So this block is actually unreachable if strict. 
    // But let's assume we want to handle the "landing" state here if we remove the above block.
    // For now, let's remove this unreachable/broken block to fix the lints
    // and just use the existing renderAccessGate logic which works.
    return null;
  }

  // If Submitted
  if (intake?.status === 'submitted') {
    return (
      <div className="flow-container">
        <IntakeHeader
          currentStepIndex={stepsInfo.length}
          firmName={firm?.firm_name}
          steps={stepsInfo}
        />
        <div className="success-screen">
          <h1>Reference ID: {intake.id.slice(0, 8)}</h1>
          <h2>Case File Submitted</h2>
          <p>Your information has been securely transmitted to {firm?.firm_name}. They will review your file and contact you shortly.</p>
          <p className="note">You may close this window.</p>
        </div>
        <style jsx>{`
                  .flow-container { height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
                  .success-screen {
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      justify-content: center;
                      text-align: center;
                      padding: 24px;
                  }
                  .success-screen h1 { font-family: var(--font-mono); font-size: 14px; color: var(--text-2); margin-bottom: 24px; letter-spacing: 0.05em; }
                  .success-screen h2 { font-size: 28px; margin-bottom: 16px; color: var(--text-0); }
                  .success-screen p { font-size: 16px; color: var(--text-1); max-width: 480px; line-height: 1.6; margin-bottom: 12px; }
                  .note { font-size: 13px; color: var(--text-2); margin-top: 32px; }
              `}</style>
      </div>
    );
  }

  // If Ready for Review
  if (intake?.status === 'ready_for_review') {
    return (
      <div className="flow-container">
        <IntakeHeader
          currentStepIndex={stepsInfo.length} // Show as completed
          firmName={firm?.firm_name}
          steps={stepsInfo}
        />
        <main className="flow-main">
          <IntakeReview
            intake={intake}
            schema={GA_DIVORCE_CUSTODY_V1}
            onSubmit={async (questions) => {
              const res = await fetch('/api/intake/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, questions })
              });
              if (!res.ok) {
                const err = await res.json();
                throw new Error(err.details || 'Submission failed');
              }
              await load(token!);
            }}
          />
        </main>
        <style jsx>{`
                  .flow-container { height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
                  .flow-main { flex: 1; overflow-y: auto; background: var(--surface-1); }
              `}</style>
      </div>
    );
  }

  // Loading state for resume
  if (mode === 'resume' && !hasLoaded) {
    return (
      <div className="flow-loading">
        <style jsx global>{globalStyles}</style>
        <p>Loading intake...</p>
      </div>
    );
  }

  return (
    <div className="intake-layout">
      <style jsx global>{globalStyles}</style>
      <IntakeHeader
        firmName={firm?.firm_name}
        steps={stepsInfo}
        currentStepIndex={currentStepIndex}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="intake-main">
        <div className="chat-container">

          <GuidedChatPanel
            sectionId={step?.id}
            library={GUIDED_PROMPT_LIBRARY}
            missingFields={missingFields}
            disabled={isLocked || loading}
            messages={messages}
            token={token}
            intakeId={intakeId}
            firmName={firm?.firm_name}
            onSaveMessages={async (newMessages) => {
              if (isLocked) return;
              setUiError(null);
              queueMessages(newMessages);
              await flushPending();
            }}
            onRefresh={() => load(token!)} // Force reload to get updated payload
            onJumpToField={(fieldKey) => {
              setSidebarOpen(true);
            }}
          />
        </div>

        <IntakeSidebar
          open={sidebarOpen}
          payload={payload}
          firmName={firm?.firm_name}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      </main>

      <ErrorBanner message={displayError} requestId={requestId} />
      {isLocked && <LockedConfirmation submittedAt={submittedAt} />}

      <style jsx>{`
        .intake-layout {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          flex-direction: column;
        }

        .sidebar-toggle-mobile {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 100;
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 24px;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          display: none; /* Hidden by default, shown on mobile */
        }

        @media (max-width: 768px) {
          .sidebar-toggle-mobile {
            display: block;
          }
        }

        .flow-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg);
          position: relative;
        }

        .intake-main {
          flex: 1;
          display: flex;
          position: relative;
          overflow: hidden;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding: 24px;
        }

        .flow-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: var(--text-2);
        }
      `}</style>
    </div>
  );
}
