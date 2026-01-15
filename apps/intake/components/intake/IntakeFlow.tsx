import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { intakeSteps } from './steps';
import WarningsPanel from './WarningsPanel';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import LockedConfirmation from './LockedConfirmation';
import ErrorBanner from './ErrorBanner';
import GuidedChatPanel from './GuidedChatPanel';
import SafetyBanner from './SafetyBanner';
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
import IntakeReview from './IntakeReview';
import IntakeLayout from './IntakeLayout';
import { X } from 'lucide-react'; // Import the new component

import { getFriendlyStepLabel } from './progressConfig';

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

  const visibleSteps = useMemo(() => {
    const rawIds = Array.from(enabledSectionIds);
    // Explicit Order for display
    const outputOrder = [
      'matter_metadata',
      'client_identity',
      'opposing_party',
      'marriage_details',
      'separation_grounds',
      'child_object',
      'children_custody',
      'asset_object',
      'debt_object',
      'income_support',
      'domestic_violence_risk',
      'jurisdiction_venue',
      'prior_legal_actions',
      'desired_outcomes',
      'evidence_documents'
    ];

    const sorted = rawIds.sort((a, b) => {
      const idxA = outputOrder.indexOf(a);
      const idxB = outputOrder.indexOf(b);
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    sorted.push('final_review');

    return sorted.map((id, index) => ({
      id,
      label: getFriendlyStepLabel(id),
      isCompleted: index < currentStepIndex,
      isActive: index === currentStepIndex,
    }));
  }, [enabledSectionIds, currentStepIndex]);

  // Calculate total percentage for SideNav
  const totalCompletion = useMemo(() => {
    if (!visibleSteps.length) return 0;
    return Math.round((currentStepIndex / visibleSteps.length) * 100);
  }, [currentStepIndex, visibleSteps.length]);

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

  // DATE FIX & SYNC FIX
  useEffect(() => {
    if (!intakeId || isLocked || loading) return;

    // 1. Auto-fill System Fields if missing
    if (!payload.matter_type) {
      updateField('matter_type', 'divorce'); // Valid default
    }
    if (!payload.date_of_intake) {
      updateField('date_of_intake', new Date().toISOString().split('T')[0]);
    }
    if (!payload.urgency_level) {
      updateField('urgency_level', 'routine');
    }
    if (!payload.intake_channel) {
      updateField('intake_channel', 'web');
    }

    // 2. Force Sync UI to first incomplete step
    // This prevents "drift" where AI is on Step 5 but UI is on Step 1.
    // We only drift FORWARD.
    if (visibleSteps.length > 0) {
      const firstIncompleteIndex = visibleSteps.findIndex(step => {
        const missing = missingFieldsForSection(payload, GA_DIVORCE_CUSTODY_V1, step.id);
        return missing.length > 0;
      });

      if (firstIncompleteIndex !== -1 && firstIncompleteIndex > currentStepIndex) {
        setCurrentStepIndex(firstIncompleteIndex);
      } else if (firstIncompleteIndex === -1 && currentStepIndex < visibleSteps.length - 1) {
        // All steps complete? Move to last
        setCurrentStepIndex(visibleSteps.length - 1);
      }
    }
  }, [intakeId, isLocked, loading, payload, visibleSteps, currentStepIndex, updateField]);

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
        <IntakeSidebar
          open={sidebarOpen}
          payload={payload}
          firmName={firm?.firm_name}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
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



  // Loading state for resume
  if (mode === 'resume' && !hasLoaded) {
    return (
      <div className="flow-loading">
        <style jsx global>{globalStyles}</style>
        <p>Loading intake...</p>
      </div>
    );
  }



  // Debug Missing Fields
  useEffect(() => {
    if (visibleSteps.length > 0) {
      const step1 = visibleSteps[0];
      const missing = missingFieldsForSection(payload, GA_DIVORCE_CUSTODY_V1, step1.id);
      console.log('[DEBUG] Step 1 Missing Fields:', missing);
      console.log('[DEBUG] Current Payload:', payload);
    }
  }, [payload, visibleSteps]);

  return (
    <IntakeLayout
      firmName={firm?.firm_name}
      steps={visibleSteps}
      currentStepIndex={currentStepIndex}
      completionPercentage={totalCompletion}
      sidebarOpen={sidebarOpen}
      sidebar={
        <IntakeSidebar
          open={sidebarOpen}
          payload={payload}
          firmName={firm?.firm_name}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      }
    >
      <div className="flex h-full relative">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative min-w-0 bg-bg">
          {/* Mobile Toggle for Sidebar */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 right-4 z-40 p-2 bg-surface-1 border border-border rounded-lg shadow-sm hover:bg-surface-2 transition-colors lg:hidden"
            >
              <span className="sr-only">Open Case Details</span>
              {/* Icon placeholder - usually Info or Sidebar icon */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="15" x2="15" y1="3" y2="21" /></svg>
            </button>
          )}
          <AnimatePresence mode="wait">
            {/* REVIEW SCREEN */}
            {status === 'ready_for_review' || status === 'submitted' ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-10 bg-bg overflow-y-auto"
              >
                <IntakeReview
                  intake={intake!}
                  schema={GA_DIVORCE_CUSTODY_V1}
                  onSubmit={async (q) => {
                    // Adapting to IntakeReview which returns questions string
                    // But we need to call submit API? 
                    // IntakeReview expects onSubmit to be async (questions) => void.
                    // We can define a local wrapper or use the one we have?
                    // Existing 'handleSubmit' is argumentless and submits the WHOLE payload.
                    // IntakeReview seems to want to submit final questions.

                    // Let's us inline implementation for now to match Review's expectation:
                    const res = await fetch('/api/intake/submit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ token, questions: q })
                    });
                    if (!res.ok) throw new Error('Submission failed');
                    await load(token!);
                  }}
                />
              </motion.div>
            ) : (
              /* CHAT SCREEN */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <GuidedChatPanel
                  messages={messages}
                  onSaveMessages={async (newMessages) => {
                    if (isLocked) return;
                    setUiError(null);
                    queueMessages(newMessages);
                    await flushPending();
                  }}
                  onJumpToField={(k) => setSidebarOpen(true)}
                  sectionId={step?.id}
                  library={GUIDED_PROMPT_LIBRARY}
                  missingFields={missingFields}
                  token={token}
                  intakeId={intakeId}
                  firmName={firm?.firm_name}
                  disabled={isLocked || loading}
                  onRefresh={() => load(token!)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Overlays */}
          <div className="absolute top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
            {activeBanners.map((banner) => (
              <div key={banner.key} className="pointer-events-auto">
                <SafetyBanner
                  title={banner.title}
                  lines={banner.lines}
                  variant={banner.variant as any}
                  onDismiss={() => {
                    setDismissedBanners((prev) => ({ ...prev, [banner.key]: true }));
                  }}
                />
              </div>
            ))}
          </div>
        </div>


      </div>
      <ErrorBanner message={displayError} requestId={requestId} />
      {isLocked && <LockedConfirmation submittedAt={submittedAt} />}
    </IntakeLayout>
  );
}
