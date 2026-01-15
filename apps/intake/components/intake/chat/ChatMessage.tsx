
import { type IntakeMessage } from '../../../../../lib/intake/intakeApi';
import DocumentRequestCard from './DocumentRequestCard';

type ChatMessageProps = {
  message: IntakeMessage;
  isLatest?: boolean;
  token?: string;
  intakeId?: string | null;
};

export default function ChatMessage({ message, isLatest, token, intakeId }: ChatMessageProps) {
  const isClient = message.source === 'client';
  const isSystem = message.source === 'system';

  // Check for structured document request
  const docRequest = message.content_structured?.documentRequest as { type: string; reason: string } | undefined;

  return (
    <div className={`message ${isClient ? 'is-client' : 'is-ai'} ${isLatest ? 'is-latest' : ''}`}>
      <div className="message__avatar">
        {isClient ? (
          <div className="avatar-icon client">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        ) : (
          <div className="avatar-icon ai">
            {/* Minimal Sparkle/AI icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        )}
      </div>

      <div className="message__content">
        <div className="sender-name">{isClient ? 'You' : 'Verilex AI'}</div>
        <div className="text-content">
          {message.content.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
        {docRequest && token && (
          <div style={{ marginTop: '12px' }}>
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
        .message {
          display: flex;
          gap: 16px;
          padding: 24px 0;
          border-bottom: 1px solid transparent;
          animation: fadeIn 0.4s ease-out;
        }

        .message.is-ai {
          /* AI specific styling if needed */
        }

        .message:not(.is-latest) {
          opacity: 0.8; 
          /* "Previous turns fade out slightly" */
        }

        .message__avatar {
          flex-shrink: 0;
          padding-top: 4px;
        }

        .avatar-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-1);
          color: var(--text-2);
        }

        .avatar-icon.ai {
          background: var(--accent-glow); /* Subtle tint */
          color: var(--accent-light);
          background: rgba(139, 92, 246, 0.1);
        }

        .message__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-width: 680px; /* Optimal reading width */
        }

        .sender-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-2);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .text-content {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-0);
          font-weight: 400;
        }
        
        .text-content p {
          margin-bottom: 8px;
        }
        
        .text-content p:last-child {
          margin-bottom: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
