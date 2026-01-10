import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { intakeSteps } from './steps';
import WarningsPanel from './WarningsPanel';
import ReviewSubmitStep from './steps/ReviewSubmitStep';
import LockedConfirmation from './LockedConfirmation';
import ErrorBanner from './ErrorBanner';
import { useIntakeSession } from './useIntakeSession';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { runConsistencyChecks } from '../../../../lib/intake/consistencyChecks';
import type { ResolveFirmResponse } from '../../../../lib/intake/intakeApi';
import {
  getSectionTitle,
  intakeSections,
  validate,
  validateIntakePayload,
} from '../../../../lib/intake/validation';

const narrativePrompts: Record<string, string> = {
  matter_metadata: 'Share the core reason you are starting this intake and the urgency level.',
  client_identity: 'Add the key identity and contact details for this case.',
  opposing_party: 'Tell us who the opposing party is and how you typically reach them.',
  marriage_details: 'Summarize the marriage timeline in your own words.',
  separation_grounds: 'Describe the separation status and any grounds details.',
  child_object: 'Tell us about each child involved in this matter.',
  children_custody: 'Describe the custody situation and any existing plans or orders.',
  asset_object: 'Outline each asset you want documented.',
  income_support: 'Explain the income situation and support expectations.',
  debt_object: 'List any debts that need to be addressed.',
  domestic_violence_risk: 'Share any safety concerns that should be on our radar.',
  jurisdiction_venue: 'Explain anything relevant to residency or venue concerns.',
  prior_legal_actions: 'Summarize any prior legal actions related to this matter.',
  desired_outcomes: 'Describe your goals and desired outcomes.',
  evidence_documents: 'List evidence or documents you already have.',
};

const fieldToSectionId = new Map<string, string>();
for (const section of intakeSections) {
  for (const field of section.fields) {
    fieldToSectionId.set(field.key, section.id);
  }
}

const stepIndexById = new Map<string, number>();
intakeSteps.forEach((stepItem, index) => {
  stepIndexById.set(stepItem.id, index);
});

type IntakeFlowProps = {
  firmSlug: string;
  mode: 'new' | 'resume';
  initialToken?: string;
  onStatusChange?: (status: 'draft' | 'submitted' | null) => void;
  onFirmResolved?: (firm: ResolveFirmResponse | null) => void;
};

type NarrativeHistoryItem = { prompt: string; response: string };

type NarrativeStatus = 'idle' | 'saving' | 'saved' | 'error';

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
  const [narratives, setNarratives] = useState<Record<string, string>>({});
  const [narrativeStatus, setNarrativeStatus] = useState<Record<string, NarrativeStatus>>({});
  const [narrativeHistory, setNarrativeHistory] = useState<Record<string, NarrativeHistoryItem[]>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [confirmFinal, setConfirmFinal] = useState(false);

  const step = intakeSteps[currentStepIndex] ?? intakeSteps[0];

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
    currentStepId: step.id,
  });

  const intakeId = intake?.id ?? null;
  const status = intake?.status ?? null;
  const submittedAt = intake?.submitted_at ?? null;
  const isLocked = locked || status === 'submitted' || Boolean(submittedAt);

  const validation = useMemo(() => validateIntakePayload(payload), [payload]);
  const missingBySection = validation.missingBySection;
  const validationSummary = useMemo(() => validate(payload), [payload]);
  const consistency = useMemo(() => runConsistencyChecks(payload), [payload]);
  const warningItems = useMemo(
    () =>
      consistency.warnings.map((warning, index) => {
        const sectionId = warning.paths
          .map((path) => fieldToSectionId.get(path))
          .find((value): value is string => Boolean(value));
        return {
          warning,
          sectionId,
          sectionTitle: sectionId ? getSectionTitle(sectionId) : undefined,
        };
      }),
    [consistency.warnings],
  );

  const validationIssues = useMemo(() => {
    return validationSummary.missingRequiredPaths.map((path) => {
      const key = path.split('[')[0];
      const sectionId = fieldToSectionId.get(key);
      const sectionTitle = sectionId ? getSectionTitle(sectionId) : undefined;
      const message = validationSummary.errorsByPath[path]?.[0] ?? 'Required field missing.';
      return { path, message, sectionId, sectionTitle };
    });
  }, [validationSummary]);

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
    if (mode !== 'resume' || !token || hasLoaded) return;
    setUiError(null);
    void load(token).then((result) => {
      if (result) setHasLoaded(true);
    });
  }, [hasLoaded, load, mode, token]);

  useEffect(() => {
    if (intakeId) setHasLoaded(true);
  }, [intakeId]);

  const sectionMissing = new Set(missingBySection[step.id] ?? []);
  const inlineWarnings = warningItems.filter((item) => item.sectionId === step.id);

  const handleSaveStep = async () => {
    if (isLocked) return;
    setUiError(null);
    const result = await flushPending();
    if (result.locked) {
      setUiError('Intake is locked.');
      return;
    }
    if (currentStepIndex < intakeSteps.length - 1) {
      setCurrentStepIndex((prev) => Math.min(prev + 1, intakeSteps.length - 1));
    }
  };

  const handleNarrativeSend = async () => {
    if (!token || !intakeId) return;
    if (isLocked) return;
    const prompt = narrativePrompts[step.id] ?? 'Share details for this section.';
    const responseText = (narratives[step.id] ?? '').trim();
    if (!responseText) return;

    setNarrativeStatus((prev) => ({ ...prev, [step.id]: 'saving' }));
    const messages = [
      { source: 'system', channel: 'chat', content: prompt },
      { source: 'client', channel: 'chat', content: responseText },
    ];

    queueMessages(messages);
    const result = await flushPending();
    if (result.ok) {
      setNarrativeHistory((prev) => ({
        ...prev,
        [step.id]: [...(prev[step.id] ?? []), { prompt, response: responseText }],
      }));
      setNarratives((prev) => ({ ...prev, [step.id]: '' }));
      setNarrativeStatus((prev) => ({ ...prev, [step.id]: 'saved' }));
      setTimeout(() => {
        setNarrativeStatus((prev) => ({ ...prev, [step.id]: 'idle' }));
      }, 1200);
    } else {
      setNarrativeStatus((prev) => ({ ...prev, [step.id]: 'error' }));
    }
  };

  const handleSubmit = async () => {
    if (!token || !intakeId) return;
    if (!confirmFinal) {
      setUiError('Please confirm that submission is final.');
      return;
    }
    if (validationSummary.missingRequiredPaths.length > 0) {
      setUiError('Please complete required fields before submitting.');
      return;
    }

    setUiError(null);
    await flushPending();
    await submit();
  };

  useEffect(() => {
    if (currentStepIndex !== intakeSteps.length - 1 && confirmFinal) {
      setConfirmFinal(false);
    }
  }, [confirmFinal, currentStepIndex]);

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

  const StepComponent = step.Component;
  const prompt = narrativePrompts[step.id] ?? 'Share details for this section.';
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
          {intakeSteps.map((item, index) => {
            const missing = (missingBySection[item.id] ?? []).length > 0;
            return (
              <Button
                key={item.id}
                variant="unstyled"
                className={`steps__item ${index === currentStepIndex ? 'is-active' : ''}`}
                onClick={() => setCurrentStepIndex(index)}
              >
                <span className="steps__index">{index + 1}</span>
                <span className="steps__title">{item.title}</span>
                {missing && <span className="steps__alert">!</span>}
              </Button>
            );
          })}
          <div className="steps__footer">
            <div className="muted">Missing required: {validation.missingKeys.length}</div>
          </div>
        </aside>

        <main className="stage">
          <WarningsPanel items={inlineWarnings} />
          <StepComponent
            payload={payload}
            missingKeys={sectionMissing}
            narrativePrompt={prompt}
            narrativeValue={narratives[step.id] ?? ''}
            narrativeStatus={narrativeStatus[step.id] ?? 'idle'}
            narrativeDisabled={isLocked}
            token={token}
            intakeId={intakeId ?? undefined}
            documents={documents}
            onReload={() => {
              if (token) void load(token);
            }}
            onNarrativeChange={(value) => setNarratives((prev) => ({ ...prev, [step.id]: value }))}
            onNarrativeSend={handleNarrativeSend}
            onFieldChange={(key, value) => {
              setUiError(null);
              updateField(key, value);
            }}
          />

          {narrativeHistory[step.id] && narrativeHistory[step.id].length > 0 && (
            <div className="history">
              <h4>Transcript snapshots</h4>
              {narrativeHistory[step.id].map((entry, idx) => (
                <div key={`${step.id}-${idx}`} className="history__item">
                  <div className="history__prompt">{entry.prompt}</div>
                  <div className="history__response">{entry.response}</div>
                </div>
              ))}
            </div>
          )}

          <div className="actions">
            <Button
              variant="secondary"
              onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentStepIndex === 0}
            >
              Back
            </Button>
            {currentStepIndex < intakeSteps.length - 1 ? (
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

          {currentStepIndex === intakeSteps.length - 1 && (
            <ReviewSubmitStep
              issues={validationIssues}
              messages={messages}
              onJump={handleJumpToSection}
              confirmChecked={confirmFinal}
              onConfirmChange={setConfirmFinal}
              disabled={isLocked}
            />
          )}

          <WarningsPanel items={warningItems} onJump={handleJumpToSection} />
        </main>
      </div>
    </div>
  );
}
