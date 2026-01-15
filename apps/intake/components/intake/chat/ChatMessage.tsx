
import { type IntakeMessage } from '../../../../../lib/intake/intakeApi';
import DocumentRequestCard from './DocumentRequestCard';

type ChatMessageProps = {
  message: IntakeMessage;
  isLatest?: boolean;
  token?: string;
  intakeId?: string | null;
  firmName?: string;
};

export default function ChatMessage({ message, isLatest, token, intakeId, firmName }: ChatMessageProps) {
  const isClient = message.source === 'client';

  // Check for structured document request
  const docRequest = message.content_structured?.documentRequest as { type: string; reason: string } | undefined;

  return (
    <div className={`message-row ${isClient ? 'user' : 'ai'} ${isLatest ? 'latest' : ''}`}>
      {!isClient && (
        <div className="avatar">
          {/* Minimal Sparkle/AI icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-light">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </div>
      )}

      <div className="bubble-container">
        {/* Only show name for AI if needed, usually bubbles imply it */}
        {!isClient && <span className="sender-name">{firmName || 'The Firm'}</span>}

        <div className="bubble">
          {message.content.split('\n').map((line, i) => (
            line.trim() ? <p key={i}>{line}</p> : <br key={i} />
          ))}
        </div>

        {docRequest && token && (
          <div className="mt-3">
            <DocumentRequestCard
              token={token}
              intakeId={intakeId ?? null}
              documentType={docRequest.type}
              reason={docRequest.reason}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        .message-row {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          width: 100%;
          animation: slideUp 0.3s ease-out;
        }

        .message-row.user {
          justify-content: flex-end;
        }

        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.1); /* accent-glow */
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .bubble-container {
          display: flex;
          flex-direction: column;
          max-width: 80%;
          align-items: flex-start;
        }

        .message-row.user .bubble-container {
          align-items: flex-end;
        }

        .sender-name {
          font-size: 11px;
          color: var(--text-2);
          margin-bottom: 4px;
          margin-left: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .bubble {
          padding: 12px 16px;
          border-radius: 18px;
          font-size: 15px;
          line-height: 1.5;
          position: relative;
          word-wrap: break-word;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .message-row.ai .bubble {
            background: var(--surface-2); /* slightly lighter than bg */
            color: var(--text-0);
            border-top-left-radius: 4px; /* distinct shape */
            border: 1px solid var(--border);
        }

        .message-row.user .bubble {
            background: var(--primary, #3b82f6); /* fallback blue */
            background-color: var(--accent); /* purple */
            color: white;
            border-top-right-radius: 4px;
        }

        .message-row.user .bubble p {
            color: white; /* Ensure text matches contrast */
        }

        p { margin: 0; }
        p + p { margin-top: 8px; }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
