import type { IntakeMessage } from '../../../../../lib/intake/intakeApi';
import ReviewSubmit from '../ReviewSubmit';
import Card from '../../ui/Card';
import Input from '../../ui/Input';

type ValidationIssue = {
  path: string;
  message: string;
  sectionId?: string;
  sectionTitle?: string;
};

type ReviewSubmitStepProps = {
  issues: ValidationIssue[];
  messages: IntakeMessage[];
  confirmChecked: boolean;
  onConfirmChange: (checked: boolean) => void;
  disabled?: boolean;
  onJump?: (sectionId: string) => void;
};

export default function ReviewSubmitStep({
  issues,
  messages,
  confirmChecked,
  onConfirmChange,
  disabled = false,
  onJump,
}: ReviewSubmitStepProps) {
  return (
    <Card>
      <ReviewSubmit issues={issues} messages={messages} onJump={onJump} />
      <label className="field__label" style={{ marginTop: '16px' }}>
        <Input
          type="checkbox"
          checked={confirmChecked}
          unstyled
          onChange={(event) => onConfirmChange(event.target.checked)}
          disabled={disabled}
        />{' '}
        I confirm this record reflects the statements I provided. This is not legal advice.
      </label>
    </Card>
  );
}
