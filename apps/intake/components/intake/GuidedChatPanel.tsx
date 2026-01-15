import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import ChatMessage from './chat/ChatMessage';
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

  const transcript = useMemo(() => messages.filter((message) => message.channel === 'chat'), [messages]);
  const section = library.sections[sectionId];
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length]);

  if (!section) {
    return (
      <div className="chat-area empty">
        <p className="muted">No guided conversation available.</p>
      </div>
    );
  }

  // Logic: Determine Active Question (Narrative vs Next Required)
  const narrative = section.narrativePrompt;
  const narrativeResponse = findPromptResponse(narrative.prompt, transcript);

  const requiredPrompts = missingFields
    .map((fieldKey) => section.fieldPrompts[fieldKey])
    .filter((prompt): prompt is FieldPrompt => Boolean(prompt))
    .filter((prompt) => prompt.askIfMissing);

  // First missing prompt is the active one
  const activePrompt = !narrativeResponse ? null : requiredPrompts[0];

  // Calculate actions (reveals) from *past* answers that are still relevant?
  // For simplicity, we only check the active prompt's reveals if it was just answered? 
  // But wait, if they are answered, they are in the transcript.
  // We want to show buttons if a *recent* answer triggered them.
  // Let's iterate all required prompts that HAVE answers, and collect their reveals.
  // Actually, reveals are usually navigation jumps. 
  const activeReveals = useMemo(() => {
    const reveals: string[] = [];
    Object.values(section.fieldPrompts).forEach(prompt => {
      if (!prompt) return;
      const resp = findPromptResponse(prompt.prompt, transcript);
      if (resp) {
        const paths = resolveRevealPaths(prompt, resp);
        reveals.push(...paths);
      }
    });
    // Also narrative might have reveals? (Unlikely in schema, but possible)
    return Array.from(new Set(reveals));
  }, [section, transcript]);

  const handleSend = async (promptId: string, promptText: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setStatuses((prev) => ({ ...prev, [promptId]: 'saving' }));

    const result = await onSendMessage(promptText, trimmed);

    if (result.ok) {
      setInputs((prev) => ({ ...prev, [promptId]: '' }));
      setStatuses((prev) => ({ ...prev, [promptId]: 'saved' }));
      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [promptId]: 'idle' }));
      }, 1000);
    } else {
      setStatuses((prev) => ({ ...prev, [promptId]: 'error' }));
    }
  };

  return (
    <div className="chat-stream">
      <div className="transcript-container" ref={transcriptRef}>
        {/* Render History */}
        {transcript.map((msg, i) => (
          <ChatMessage key={i} message={msg} isLatest={i === transcript.length - 1} />
        ))}

        {/* Render Active Turn */}
        <div className="active-turn">
          {/* If Narrative Not Answered */}
          {!narrativeResponse && (
            <div className="prompt-block">
              <ChatMessage
                message={{ source: 'system', channel: 'chat', content: narrative.prompt }}
                isLatest={true}
              />
              <div className="input-wrapper">
                <Textarea
                  className="chat-input"
                  rows={2}
                  placeholder="Type your response..."
                  value={inputs[narrative.id] ?? ''}
                  onChange={(e) => setInputs(p => ({ ...p, [narrative.id]: e.target.value }))}
                  disabled={disabled}
                  unstyled
                />
                <div className="input-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleSend(narrative.id, narrative.prompt, inputs[narrative.id] ?? '')}
                    disabled={disabled || !inputs[narrative.id]?.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* If Narrative Answered, Show Next Required Prompt */}
          {narrativeResponse && activePrompt && (
            <div className="prompt-block">
              <ChatMessage
                message={{ source: 'system', channel: 'chat', content: activePrompt.prompt }}
                isLatest={true}
              />
              <div className="input-wrapper">
                <Textarea
                  className="chat-input"
                  rows={2}
                  placeholder="Type your response..."
                  value={inputs[activePrompt.fieldKey] ?? ''}
                  onChange={(e) => setInputs(p => ({ ...p, [activePrompt.fieldKey]: e.target.value }))}
                  disabled={disabled}
                  unstyled
                />
                <div className="input-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleSend(activePrompt.fieldKey, activePrompt.prompt, inputs[activePrompt.fieldKey] ?? '')}
                    disabled={disabled || !inputs[activePrompt.fieldKey]?.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* If All Complete */}
          {narrativeResponse && !activePrompt && (
            <ChatMessage
              message={{ source: 'system', channel: 'chat', content: "All set for this section. Proceeding..." }}
              isLatest={true}
            />
          )}

          {/* Suggested Actions (Reveals) */}
          {activeReveals.length > 0 && (
            <div className="suggested-actions">
              {activeReveals.map(fieldKey => (
                <Button
                  key={fieldKey}
                  variant="secondary"
                  onClick={() => onJumpToField(fieldKey)}
                  disabled={disabled}
                  className="action-pill"
                >
                  Edit {formatLabel(fieldKey)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .chat-stream {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden; /* Main main scroll via container */
        }

        .transcript-container {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 40px;
          display: flex;
          flex-direction: column;
        }

        .active-turn {
          margin-top: 24px;
          animation: slideUp 0.4s ease-out;
        }

        .input-wrapper {
          margin-left: 44px; /* Align with text, offset by avatar (28+16) */
          margin-top: 16px;
          position: relative;
        }

        .chat-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid var(--border);
          color: var(--text-0);
          font-size: 16px;
          padding: 8px 0;
          font-family: inherit;
          resize: none;
          transition: border-color 0.2s;
        }

        .chat-input:focus {
          outline: none;
          border-color: var(--text-1);
        }

        .input-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 12px;
        }

        .suggested-actions {
          margin-top: 24px;
          margin-left: 44px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
