import type { IntakeMessage } from '../../../../lib/intake/intakeApi';
import { formatLabel } from '../../../../lib/intake/validation';
import Button from '../ui/Button';

type ValidationIssue = {
  path: string;
  message: string;
  sectionId?: string;
  sectionTitle?: string;
};

type ReviewSubmitProps = {
  issues: ValidationIssue[];
  messages: IntakeMessage[];
  onJump?: (sectionId: string) => void;
};

function baseKey(path: string) {
  const match = path.match(/^([a-zA-Z0-9_]+)/);
  return match ? match[1] : path;
}

export default function ReviewSubmit({ issues, messages, onJump }: ReviewSubmitProps) {
  const transcript = messages.filter((message) => message.channel === 'chat');
  const preview = transcript.slice(-6);

  return (
    <div className="review">
      <div className="review__header">
        <h3>Review &amp; submit</h3>
        <p className="muted">
          {issues.length === 0
            ? 'All required fields are complete.'
            : `Missing required fields: ${issues.length}`}
        </p>
      </div>

      <div className="review__section">
        <h4>Transcript preview</h4>
        {preview.length === 0 ? (
          <p className="muted">No transcript messages yet.</p>
        ) : (
          <div className="review__transcript">
            {preview.map((message, index) => (
              <div key={`${message.seq ?? index}-${message.channel}`} className="review__message">
                <div className="review__message-meta">{message.source}</div>
                <div className="review__message-body">{message.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <div className="review__section">
          <h4>Required fields</h4>
          <div className="review__issues">
            {issues.map((issue) => {
              const label = formatLabel(baseKey(issue.path));
              return (
                <div key={issue.path} className="review__issue">
                  <div>
                    <div className="review__issue-title">{label}</div>
                    <div className="review__issue-message">{issue.message}</div>
                    {issue.sectionTitle && <div className="review__issue-section">Section: {issue.sectionTitle}</div>}
                  </div>
                  {issue.sectionId && onJump && (
                    <Button
                      variant="unstyled"
                      className="review__jump"
                      onClick={() => onJump(issue.sectionId!)}
                    >
                      Jump
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
