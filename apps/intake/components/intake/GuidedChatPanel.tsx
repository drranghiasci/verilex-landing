import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import ChatMessage from './chat/ChatMessage';
import VoiceInput from './chat/VoiceInput';
import type { IntakeMessage } from '../../../../lib/intake/intakeApi';
import { PromptLibrary } from '../../../../lib/intake/guidedChat/promptLibrary';

type ChatStatus = 'idle' | 'saving' | 'saved' | 'error';

type GuidedChatPanelProps = {
  sectionId: string;
  library: PromptLibrary;
  missingFields: string[];
  messages: IntakeMessage[];
  token: string | undefined;
  intakeId?: string | null;
  firmName?: string;
  disabled?: boolean;
  onSaveMessages: (messages: IntakeMessage[]) => Promise<void>;
  onJumpToField: (fieldKey: string) => void;
  onRefresh?: () => void;
};

export default function GuidedChatPanel({
  sectionId,
  library,
  messages,
  token,
  intakeId,
  firmName,
  disabled,
  onSaveMessages,
  onRefresh,
}: GuidedChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Filter messages to chat channel only
  const transcript = useMemo(() => messages.filter((message) => message.channel === 'chat'), [messages]);
  const section = library.sections[sectionId];
  // Scroll to bottom on new message
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript.length, isAiTyping]);

  // Initial Seeding: If chat is empty, AI should speak first
  const didInitRef = useRef(false);

  useEffect(() => {
    if (transcript.length === 0 && section?.narrativePrompt && token && !didInitRef.current) {
      didInitRef.current = true;
      const kickstart = async () => {
        setIsAiTyping(true);
        try {
          const response = await fetch('/api/intake/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              message: 'START_CONVERSATION',
              history: [],
              sectionId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.response) {
              const aiMsg: IntakeMessage = { source: 'system', channel: 'chat', content: data.response };
              await onSaveMessages([aiMsg]);
            }
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.details || errorData.error || 'Startup failed');
          }
        } catch (e: any) {
          console.error(e);
          const errorMsg: IntakeMessage = {
            source: 'system',
            channel: 'chat',
            content: `⚠️ **Startup Error**: Failed to initialize AI conversation. (${e.message})`
          };
          await onSaveMessages([errorMsg]);
        } finally {
          setIsAiTyping(false);
        }
      };

      void kickstart();
    }
  }, [transcript.length, section, token]);

  const handleSend = async (overrideMessage?: string) => {
    const msg = typeof overrideMessage === 'string' ? overrideMessage : inputText;
    const trimmed = msg.trim();

    if (!trimmed || !token) return;

    setStatus('saving');
    setInputText('');

    const displayContent = trimmed === 'RESUME_INTAKE' ? 'Resuming...' : trimmed;

    const userMsg: IntakeMessage = { source: 'client', channel: 'chat', content: displayContent };
    await onSaveMessages([userMsg]);

    setIsAiTyping(true);

    try {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || 'AI request failed');
      }
      const data = await response.json();

      if (data.safetyTrigger) {
        const safetyMsg: IntakeMessage = {
          source: 'system',
          channel: 'chat',
          content: '⚠️ **WARNING: IMMEDIATE SAFETY CONCERN DETECTED.**\n\nPlease call **911** immediately if you are in danger.\n\nThis intake session is paused.'
        };
        await onSaveMessages([safetyMsg]);
      }

      if (data.response && !data.safetyTrigger) {
        const aiMsg: IntakeMessage = {
          source: 'system',
          channel: 'chat',
          content: data.response,
          content_structured: data.documentRequest ? { documentRequest: data.documentRequest } : undefined
        };
        await onSaveMessages([aiMsg]);
      }

      if (data.updates && Object.keys(data.updates).length > 0) {
        onRefresh?.();
      }

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1000);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      const errorMsg: IntakeMessage = {
        source: 'system',
        channel: 'chat',
        content: `⚠️ **Connection Error**: ${err.message || 'Unable to reach AI'}. Please try refreshing or checking your connection.`
      };
      await onSaveMessages([errorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  return (
    <div className="chat-stream">
      <div className="transcript-container">
        {transcript.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isLatest={i === transcript.length - 1}
            token={token}
            intakeId={intakeId}
            firmName={firmName}
          />
        ))}

        {isAiTyping && (
          <div className="typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
        <div ref={bottomRef} style={{ minHeight: '1px' }} />
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={textareaRef}
            className="chat-input"
            rows={1}
            placeholder="Type your answer..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <div className="actions-area">
            <VoiceInput
              onTextReady={(text) => {
                const newValue = inputText ? `${inputText} ${text}` : text;
                setInputText(newValue);
                textareaRef.current?.focus();
              }}
              disabled={disabled}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputText.trim() || disabled}
              className="send-btn"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
        <div className="resume-container">
          <button
            className="resume-link"
            onClick={() => handleSend('RESUME_INTAKE')}
          >
            Stuck? Resume Intake
          </button>
        </div>
      </div>

      <style jsx>{`
        .chat-stream {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }

        .resume-container {
            text-align: center;
            margin-top: 8px;
        }
        .resume-link {
            background: none;
            border: none;
            color: var(--text-2);
            font-size: 11px;
            cursor: pointer;
            text-decoration: underline;
        }
        .resume-link:hover { color: var(--text-1); }

        .transcript-container {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .typing-indicator {
          padding: 16px 0 16px 52px;
          display: flex;
          gap: 4px;
        }
        
        .dot {
            width: 6px;
            height: 6px;
            background: var(--text-2);
            border-radius: 50%;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .dot:nth-child(1) { animation-delay: -0.32s; }
        .dot:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
        }

        .input-area {
            padding-top: 20px;
            background: linear-gradient(to bottom, rgba(var(--bg-rgb), 0) 0%, var(--bg) 20%);
        }

        .input-wrapper {
          position: relative;
          background: var(--surface-1);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 12px;
          display: flex;
          align-items: flex-end; /* Align bottom for multi-line support */
          gap: 12px;
          transition: border-color 0.2s;
        }
        
        .input-wrapper:focus-within {
            border-color: var(--text-1);
        }

        .chat-input {
          flex: 1; /* Take available space */
          background: transparent;
          border: none;
          color: var(--text-0);
          font-size: 15px;
          padding: 8px 0;
          font-family: inherit;
          resize: none;
          min-height: 24px;
          max-height: 200px;
        }

        .chat-input:focus {
          outline: none;
      }
        
        .actions-area {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 4px; /* Align with single line text */
        }
        
        .send-btn {
            background: var(--primary);
            color: white;
            border-radius: 50%;
            border: none;
            width: 32px;
            height: 32px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.2s;
            cursor: pointer;
        }
        .send-btn:hover:not(:disabled) {
           filter: brightness(1.1);
        }
        .send-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: var(--surface-3); /* disabled state grey */
        }
      `}</style>
    </div>
  );
}
