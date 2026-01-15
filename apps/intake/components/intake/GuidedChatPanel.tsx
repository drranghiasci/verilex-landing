
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
  token: string | undefined;
  intakeId?: string | null;
  disabled?: boolean;
  onSaveMessages: (messages: IntakeMessage[]) => Promise<void>;
  onJumpToField: (fieldKey: string) => void;
  onRefresh?: () => void;
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
  token,
  intakeId,
  disabled,
  onSaveMessages,
  onJumpToField,
  onRefresh,
}: GuidedChatPanelProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ChatStatus>>({});
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Filter messages to chat channel only (though props usually only pass chat)
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
    return Array.from(new Set(reveals));
  }, [section, transcript]);

  const handleSend = async (promptId: string, promptText: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !token) return;

    // 1. Optimistic: Add User Message
    setStatuses((prev) => ({ ...prev, [promptId]: 'saving' }));
    setInputs((prev) => ({ ...prev, [promptId]: '' }));

    const userMsg: IntakeMessage = { source: 'client', channel: 'chat', content: trimmed };
    await onSaveMessages([userMsg]);

    setIsAiTyping(true);

    try {
      // 2. Call AI API
      const response = await fetch('/api/intake/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          message: trimmed,
          history: messages.map(m => ({ source: m.source, content: m.content })),
          sectionId,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');
      const data = await response.json();

      // 3. Add AI Response
      if (data.response) {
        const aiMsg: IntakeMessage = {
          source: 'system',
          channel: 'chat',
          content: data.response,
          content_structured: data.documentRequest ? { documentRequest: data.documentRequest } : undefined
        };
        await onSaveMessages([aiMsg]);
      }

      // 4. Refresh payload if updates occurred
      if (data.updates && Object.keys(data.updates).length > 0) {
        onRefresh?.();
      }

      setStatuses((prev) => ({ ...prev, [promptId]: 'saved' }));
      setTimeout(() => setStatuses((prev) => ({ ...prev, [promptId]: 'idle' })), 1000);

    } catch (err) {
      console.error(err);
      setStatuses((prev) => ({ ...prev, [promptId]: 'error' }));
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="chat-stream">
      <div className="transcript-container" ref={transcriptRef}>
        {/* Render History */}
        {transcript.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isLatest={i === transcript.length - 1}
            token={token}
            intakeId={intakeId}
          />
        ))}
        {isAiTyping && (
          <div className="typing-indicator muted">Verilex AI is checking...</div>
        )}

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
                  disabled={disabled || isAiTyping}
                  unstyled
                />
                <div className="input-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleSend(narrative.id, narrative.prompt, inputs[narrative.id] ?? '')}
                    disabled={disabled || isAiTyping || !inputs[narrative.id]?.trim()}
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
                  disabled={disabled || isAiTyping}
                  unstyled
                />
                <div className="input-actions">
                  <Button
                    variant="primary"
                    onClick={() => handleSend(activePrompt.fieldKey, activePrompt.prompt, inputs[activePrompt.fieldKey] ?? '')}
                    disabled={disabled || isAiTyping || !inputs[activePrompt.fieldKey]?.trim()}
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

        .typing-indicator {
          padding: 12px 0;
          margin-left: 44px; /* Align with text */
          font-size: 14px;
          animation: pulse 1.5s infinite;
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
        @keyframes pulse {
           0% { opacity: 0.5; }
           50% { opacity: 1; }
           100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
