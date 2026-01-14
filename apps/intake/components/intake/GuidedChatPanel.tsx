import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import type { IntakeMessage } from '../../../../lib/intake/intakeApi';
import type { FieldPrompt, PromptLibrary } from '../../../../lib/intake/guidedChat/types';
import { formatLabel } from '../../../../lib/intake/validation';

type ChatStatus = 'idle' | 'saving' | 'saved' | 'error';

type GuidedChatPanelProps = {
  sectionId: string;
  library: PromptLibrary;
  missingFields: string[];
  messages: IntakeMessage[];
  disabled?: boolean;
  onSendMessage: (prompt: string, response: string) => Promise<{ ok: boolean; locked?: boolean }>;
  onJumpToField: (fieldKey: string) => void;
};

function parseYesNo(response: string): boolean | null {
  const normalized = response.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(normalized)) return true;
  if (['no', 'n', 'false', '0'].includes(normalized)) return false;
  return null;
}

function resolveRevealPaths(prompt: FieldPrompt, response: string | null): string[] {
  if (!prompt.revealOn || !response) return [];
  const { whenValue, revealPaths } = prompt.revealOn;

  if (typeof whenValue === 'boolean') {
    const parsed = parseYesNo(response);
    if (parsed === null) return [];
    return parsed === whenValue ? revealPaths : [];
  }

  if (typeof whenValue === 'string') {
    return response.trim().toLowerCase() === whenValue.toLowerCase() ? revealPaths : [];
  }

  if (typeof whenValue === 'number') {
    const parsed = Number(response);
    if (Number.isNaN(parsed)) return [];
    return parsed === whenValue ? revealPaths : [];
  }

  return [];
}

function findPromptResponse(prompt: string, transcript: IntakeMessage[]): string | null {
  for (let idx = transcript.length - 1; idx >= 0; idx -= 1) {
    const message = transcript[idx];
    if (message.source === 'system' && message.content === prompt) {
      for (let j = idx + 1; j < transcript.length; j += 1) {
        const response = transcript[j];
        if (response.source === 'client') return response.content;
      }
    }
  }
  return null;
}

export default function GuidedChatPanel({
  sectionId,
  library,
  missingFields,
  messages,
  disabled,
  onSendMessage,
  onJumpToField,
}: GuidedChatPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ChatStatus>>({});
  const [reveals, setReveals] = useState<Record<string, string[]>>({});

  const transcript = useMemo(() => messages.filter((message) => message.channel === 'chat'), [messages]);
  const section = library.sections[sectionId];

  if (!section) {
    return (
      <aside className="chat-panel">
        <Card className="chat-panel__card">
          <div className="chat-panel__header">
            <h3>Guided chat</h3>
          </div>
          <p className="muted">No guided prompts are available for this section.</p>
        </Card>
      </aside>
    );
  }

  const narrative = section.narrativePrompt;
  const narrativeResponse = findPromptResponse(narrative.prompt, transcript);
  const narrativeValue = inputs[narrative.id] ?? '';

  const requiredPrompts = missingFields
    .map((fieldKey) => section.fieldPrompts[fieldKey])
    .filter((prompt): prompt is FieldPrompt => Boolean(prompt))
    .filter((prompt) => prompt.askIfMissing);

  const sendPrompt = async (promptId: string, promptText: string, responseText: string, prompt?: FieldPrompt) => {
    const trimmed = responseText.trim();
    if (!trimmed) return;
    setStatuses((prev) => ({ ...prev, [promptId]: 'saving' }));
    const result = await onSendMessage(promptText, trimmed);
    if (result.ok) {
      setInputs((prev) => ({ ...prev, [promptId]: '' }));
      setStatuses((prev) => ({ ...prev, [promptId]: 'saved' }));
      if (prompt) {
        const revealPaths = resolveRevealPaths(prompt, trimmed);
        if (revealPaths.length > 0) {
          setReveals((prev) => ({ ...prev, [promptId]: revealPaths }));
        }
      }
      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [promptId]: 'idle' }));
      }, 1200);
    } else {
      setStatuses((prev) => ({ ...prev, [promptId]: 'error' }));
    }
  };

  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length]);

  return (
    <aside className="chat-panel">
      <Card className="chat-panel__card">
        <div className="chat-panel__header">
          <div>
            <h3>Guided questions</h3>
            <p className="muted">Your answers are saved verbatim in the transcript.</p>
          </div>
          <span className="pill">Chat saved</span>
        </div>

        <div className="chat-panel__questions">
          {!narrativeResponse && (
            <div className="chat-panel__question">
              <div className="chat__prompt">{narrative.prompt}</div>
              {narrative.helperText && <div className="chat__helper muted">{narrative.helperText}</div>}
              <Textarea
                className="chat__input"
                rows={3}
                placeholder="Share here (optional)..."
                value={narrativeValue}
                onChange={(event) =>
                  setInputs((prev) => ({ ...prev, [narrative.id]: event.target.value }))
                }
                disabled={Boolean(disabled)}
                unstyled
              />
              <div className="chat__actions">
                <Button
                  variant="primary"
                  onClick={() => sendPrompt(narrative.id, narrative.prompt, narrativeValue)}
                  disabled={Boolean(disabled) || narrativeValue.trim().length === 0}
                >
                  Add to transcript
                </Button>
              </div>
            </div>
          )}

          {requiredPrompts.length > 0 && (
            <div className="chat-panel__question">
              <div className="chat__prompt">
                To keep things moving, I have a few quick questions to complete this section.
              </div>
            </div>
          )}

          {requiredPrompts.length === 0 && (
            <div className="chat-panel__question">
              <div className="chat__prompt">All required fields in this section are complete.</div>
            </div>
          )}

          {requiredPrompts.map((prompt) => {
            const promptId = prompt.fieldKey;
            const existingResponse = findPromptResponse(prompt.prompt, transcript);
            const responseValue = inputs[promptId] ?? '';
            const status = statuses[promptId] ?? 'idle';
            const revealPaths =
              reveals[promptId] ?? resolveRevealPaths(prompt, existingResponse);

            return (
              <div key={promptId} className="chat-panel__question">
                <div className="chat__prompt">{prompt.prompt}</div>
                {prompt.helperText && <div className="chat__helper muted">{prompt.helperText}</div>}
                {existingResponse ? (
                  <>
                    <div className="chat__response">Answered: {existingResponse}</div>
                    {revealPaths.length > 0 && (
                      <div className="chat__actions">
                        {revealPaths.map((fieldKey) => (
                          <Button
                            key={fieldKey}
                            variant="secondary"
                            onClick={() => onJumpToField(fieldKey)}
                            disabled={Boolean(disabled)}
                          >
                            Open {formatLabel(fieldKey)}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Textarea
                      className="chat__input"
                      rows={3}
                      placeholder="Type your response..."
                      value={responseValue}
                      onChange={(event) =>
                        setInputs((prev) => ({ ...prev, [promptId]: event.target.value }))
                      }
                      disabled={Boolean(disabled)}
                      unstyled
                    />
                    <div className="chat__actions">
                      <Button
                        variant="primary"
                        onClick={() => sendPrompt(promptId, prompt.prompt, responseValue, prompt)}
                        disabled={Boolean(disabled) || status === 'saving' || responseValue.trim().length === 0}
                      >
                        {status === 'saving' ? 'Saving...' : 'Add to transcript'}
                      </Button>
                      {status === 'saved' && <span className="chat__status">Saved</span>}
                      {status === 'error' && <span className="chat__status error">Failed to save</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="chat-panel__card">
        <div className="chat-panel__header">
          <h3>Transcript</h3>
          <span className="pill">{transcript.length} messages</span>
        </div>
        {transcript.length === 0 ? (
          <p className="muted">No transcript messages yet.</p>
        ) : (
          <div className="chat-panel__transcript" ref={transcriptRef}>
            {transcript.map((message, index) => {
              const isClient = message.source === 'client';
              return (
                <div
                  key={`${message.channel}-${index}`}
                  className={`chat-panel__bubble ${isClient ? 'is-client' : ''}`}
                >
                  <div className="chat-panel__avatar">
                    {isClient ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                        <rect x="5" y="9" width="14" height="10" rx="2" />
                        <path d="M9 21v2" />
                        <path d="M15 21v2" />
                      </svg>
                    )}
                  </div>
                  <div className="chat-panel__content">{message.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </aside>
  );
}
