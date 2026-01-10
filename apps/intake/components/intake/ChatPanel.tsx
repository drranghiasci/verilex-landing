import Button from '../ui/Button';
import Card from '../ui/Card';
import Textarea from '../ui/Textarea';
import type { IntakeMessage } from '../../../../lib/intake/intakeApi';

type ChatStatus = 'idle' | 'saving' | 'saved' | 'error';

type ChatQuestion = {
  id: string;
  prompt: string;
};

type ChatPanelProps = {
  questions: ChatQuestion[];
  answers: Record<string, string>;
  statuses: Record<string, ChatStatus>;
  disabled?: boolean;
  messages: IntakeMessage[];
  onAnswerChange: (id: string, value: string) => void;
  onSend: (question: ChatQuestion) => void;
};

export default function ChatPanel({
  questions,
  answers,
  statuses,
  disabled,
  messages,
  onAnswerChange,
  onSend,
}: ChatPanelProps) {
  const transcript = messages.filter((message) => message.channel === 'chat');

  return (
    <aside className="chat-panel">
      <Card className="chat-panel__card">
        <div className="chat-panel__header">
          <div>
            <h3>Guided questions</h3>
            <p className="muted">Add a response to save it into your transcript.</p>
          </div>
          <span className="pill">Chat saved</span>
        </div>

        {questions.length === 0 ? (
          <p className="muted">No guided questions for this section yet.</p>
        ) : (
          <div className="chat-panel__questions">
            {questions.map((question) => {
              const status = statuses[question.id] ?? 'idle';
              const value = answers[question.id] ?? '';
              return (
                <div key={question.id} className="chat-panel__question">
                  <div className="chat__prompt">{question.prompt}</div>
                  <Textarea
                    className="chat__input"
                    rows={3}
                    placeholder="Type your response..."
                    value={value}
                    onChange={(event) => onAnswerChange(question.id, event.target.value)}
                    disabled={Boolean(disabled)}
                    unstyled
                  />
                  <div className="chat__actions">
                    <Button
                      variant="primary"
                      onClick={() => onSend(question)}
                      disabled={Boolean(disabled) || status === 'saving' || value.trim().length === 0}
                    >
                      {status === 'saving' ? 'Saving...' : 'Add to transcript'}
                    </Button>
                    {status === 'saved' && <span className="chat__status">Saved</span>}
                    {status === 'error' && <span className="chat__status error">Failed to save</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="chat-panel__card">
        <div className="chat-panel__header">
          <h3>Transcript</h3>
          <span className="pill">{transcript.length} messages</span>
        </div>
        {transcript.length === 0 ? (
          <p className="muted">No transcript messages yet.</p>
        ) : (
          <div className="chat-panel__transcript">
            {transcript.map((message, index) => (
              <div
                key={`${message.channel}-${index}`}
                className={`chat-panel__bubble ${message.source === 'client' ? 'is-client' : ''}`}
              >
                {message.content}
              </div>
            ))}
          </div>
        )}
      </Card>
    </aside>
  );
}
