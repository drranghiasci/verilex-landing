
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import ChatMessage from './chat/ChatMessage';
import type { IntakeMessage } from '../../../../lib/intake/intakeApi';
import type { PromptLibrary } from '../../../../lib/intake/guidedChat/types';

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

export default function GuidedChatPanel({
  sectionId,
  library,
  messages,
  token,
  intakeId,
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
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript.length, isAiTyping]);

  // Initial Seeding: If chat is empty, AI should speak first
  useEffect(() => {
    if (transcript.length === 0 && section?.narrativePrompt && token) {
      // Trigger the AI to start the convo
      // We send a hidden system message to the API to "kickstart" it
      // But we can just call handleSend with a special flag or just empty?
      // Actually, let's just use the API directly to avoid UI flicker
      const kickstart = async () => {
        setIsAiTyping(true);
        try {
          // We send an empty message or a special "start" signal
          // The system prompt logic will see missing fields and generate the first question
          const response = await fetch('/api/intake/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token,
              message: 'START_CONVERSATION', // Special signal if we want, or just "Hello"
              history: [], // Empty history
              sectionId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.response) {
              const aiMsg: IntakeMessage = { source: 'system', channel: 'chat', content: data.response };
              await onSaveMessages([aiMsg]);
            }
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsAiTyping(false);
        }
      };

      void kickstart();
    }
  }, [transcript.length, section, token]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || !token) return;

    setStatus('saving');
    setInputText('');

    // 1. Optimistic: Add User Message
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

      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1000);

    } catch (err) {
      console.error(err);
      setStatus('error');
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
          <div className="typing-indicator">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <Textarea
            className="chat-input"
            rows={1}
            placeholder="Type your response..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || isAiTyping}
            unstyled
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={disabled || isAiTyping || !inputText.trim()}
            className="send-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </Button>
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

        .transcript-container {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .typing-indicator {
          padding: 16px 0 16px 52px; /* avatar width offset */
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
          align-items: flex-end;
          transition: border-color 0.2s;
        }
        
        .input-wrapper:focus-within {
            border-color: var(--text-1);
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-0);
          font-size: 15px;
          padding: 8px 0;
          font-family: inherit;
          resize: none;
          min-height: 24px;
          max-height: 120px;
        }

        .chat-input:focus {
          outline: none;
        }
        
        .send-btn {
            border-radius: 8px;
            width: 32px;
            height: 32px;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 8px;
            margin-bottom: 2px; 
            flex-shrink: 0;
        }

      `}</style>
    </div>
  );
}
