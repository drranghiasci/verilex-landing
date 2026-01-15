import Alert from '../ui/Alert';
import Button from '../ui/Button';
import type { SafetyBanner as SafetyBannerType } from '../../../../lib/intake/gating';

type SafetyBannerProps = {
  title: string;
  lines: string[];
  variant?: 'info' | 'error' | 'success';
  onDismiss: () => void;
};

export default function SafetyBanner({ title, lines, variant = 'error', onDismiss }: SafetyBannerProps) {
  return (
    <Alert variant={variant}>
      <div className="safety">
        <div className="safety__content">
          <h3 className="safety__title">{title}</h3>
          {lines.map((line, index) => (
            <p key={`${index}`} className="safety__line">
              {line}
            </p>
          ))}
        </div>
        <div className="safety__actions">
          <Button variant="secondary" onClick={onDismiss}>
            Continue intake
          </Button>
          <Button variant="unstyled" className="safety__hide" onClick={onDismiss}>
            Hide this message
          </Button>
        </div>
      </div>
    </Alert>
  );
}
