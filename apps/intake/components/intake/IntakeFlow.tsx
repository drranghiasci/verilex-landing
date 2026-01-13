import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { intakeSteps } from './steps';
import WarningsPanel from './WarningsPanel';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import LockedConfirmation from './LockedConfirmation';
import ErrorBanner from './ErrorBanner';
import GuidedChatPanel from './GuidedChatPanel';
import SafetyBanner from './SafetyBanner';
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
  onStatusChange?: (status: 'draft' | 'submitted' | null) => void;
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
  const enabledSectionIds = useMemo(() => getEnabledSectionIds(matterType), [matterType]);
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
    if (currentStepIndex < visibleSteps.length - 1) {
      setCurrentStepIndex((prev) => Math.min(prev + 1, visibleSteps.length - 1));
    }
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

  const displayError = uiError ?? error?.message ?? null;
  const requestId = error?.requestId ?? null;

  if (!intakeId) {
    return (
      <div className="flow">
        <ErrorBanner message={displayError} requestId={requestId} />
        {renderAccessGate()}
      </div>
    );
  }

  if (mode === 'resume' && !hasLoaded) {
    return (
      <div className="flow">
        <ErrorBanner message={displayError} requestId={requestId} />
        <Card>
          <h2>Loading intake...</h2>
          <p className="muted">We are pulling your saved intake data.</p>
        </Card>
      </div>
    );
  }

  if (!step) {
    return (
      <div className="flow">
        <ErrorBanner message={displayError} requestId={requestId} />
        <Card>
          <h2>No intake sections available</h2>
          <p className="muted">Please refresh or contact support.</p>
        </Card>
      </div>
    );
  }

  const StepComponent = step.Component;
  const handleJumpToSection = (sectionId: string) => {
    const targetIndex = stepIndexById.get(sectionId);
    if (targetIndex === undefined) return;
    setCurrentStepIndex(targetIndex);
  };

  const handleStartNew = () => {
    if (!firmSlug) return;
    setUiError(null);
    void router.push(`/intake/${firmSlug}?new=1`);
  };

  return (
    <div className="flow">
      <ErrorBanner message={displayError} requestId={requestId} />
      {isLocked && <LockedConfirmation submittedAt={submittedAt} />}

      <div className="flow__header">
        <div>
          <h1>Georgia Divorce &amp; Custody Intake</h1>
          <p className="muted">Complete every step. Required fields are enforced before submission.</p>
        </div>
        <div className="flow__meta">
          <div>
            <span className="muted">Intake ID</span>
            <div className="mono">{intakeId}</div>
          </div>
          <div>
            <span className="muted">Status</span>
            <div className="pill">{status ?? 'draft'}</div>
          </div>
          {mode === 'resume' && (
            <Button
              variant="secondary"
              onClick={handleStartNew}
              disabled={loading}
            >
              Start new intake
            </Button>
          )}
        </div>
      </div>

      <div className="flow__body">
        <aside className="steps">
          <h3>Steps</h3>
          {visibleSteps.map((item, index) => {
            const missing = shouldShowMissingIndicators && (missingBySection[item.id] ?? []).length > 0;
            return (
              <Button
                key={item.id}
                variant="unstyled"
                className={`steps__item ${index === currentStepIndex ? 'is-active' : ''}`}
                onClick={() => setCurrentStepIndex(index)}
              >
                <span className="steps__index">{index + 1}</span>
                <span className="steps__title">
                  {getSectionTitleForMatterType(item.id, matterType)}
                </span>
                {missing && <span className="steps__alert">!</span>}
              </Button>
            );
          })}
          <div className="steps__footer">
            <div className="muted">
              Missing required: {shouldShowMissingIndicators ? validation.missingKeys.length : '-'}
            </div>
          </div>
        </aside>

        <div className="flow__panels">
          <GuidedChatPanel
            sectionId={step.id}
            library={GUIDED_PROMPT_LIBRARY}
            missingFields={missingFields}
            disabled={isLocked || loading}
            messages={messages}
            onSendMessage={handleAppendChatMessage}
            onJumpToField={(fieldKey) => {
              const sectionId = fieldToSectionId.get(fieldKey);
              if (sectionId) handleJumpToSection(sectionId);
            }}
          />

          <main className="stage">
            {step?.id === 'domestic_violence_risk'
              && activeBanners.map((banner) => (
                <SafetyBanner
                  key={banner.key}
                  banner={banner}
                  onDismiss={() =>
                    setDismissedBanners((prev) => ({ ...prev, [banner.key]: true }))
                  }
                />
              ))}
            <WarningsPanel items={inlineWarnings} />
            {showRequiredErrors && hasMissingRequired && (
              <Alert variant="info">Required fields are missing. They are highlighted in red.</Alert>
            )}
            {sectionContextNote && <Alert variant="info">{sectionContextNote}</Alert>}
            <StepComponent
              payload={payload}
              missingKeys={sectionMissing}
              disabled={isLocked}
              titleOverride={sectionTitleOverride}
              token={token}
              intakeId={intakeId ?? undefined}
              documents={documents}
              onReload={() => {
                if (token) void load(token);
              }}
              onFieldChange={(key, value) => {
                setUiError(null);
                updateField(key, value);
              }}
            />

            <div className="actions">
              <Button
                variant="secondary"
                onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentStepIndex === 0}
              >
                Back
              </Button>
              {currentStepIndex < visibleSteps.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={handleSaveStep}
                  disabled={loading || isLocked}
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={
                    loading
                    || validationSummary.missingRequiredPaths.length > 0
                    || isLocked
                    || !confirmFinal
                  }
                >
                  {isLocked ? 'Submitted' : 'Submit intake'}
                </Button>
              )}
            </div>

            {currentStepIndex === visibleSteps.length - 1 && (
              <>
                {activeBanners.map((banner) => (
                  <SafetyBanner
                    key={`${banner.key}-review`}
                    banner={banner}
                    onDismiss={() =>
                      setDismissedBanners((prev) => ({ ...prev, [banner.key]: true }))
                    }
                  />
                ))}
                <ReviewSubmitStep
                  issues={validationIssues}
                  messages={messages}
                  onJump={handleJumpToSection}
                  confirmChecked={confirmFinal}
                  onConfirmChange={setConfirmFinal}
                  disabled={isLocked}
                />
              </>
            )}

            <WarningsPanel items={warningItems} onJump={handleJumpToSection} />
          </main>
        </div>
      </div>
    </div>
  );
}
