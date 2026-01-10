import Alert from '../ui/Alert';
import Button from '../ui/Button';
import type { SafetyBanner as SafetyBannerType } from '../../../../lib/intake/gating';

type SafetyBannerProps = {
  banner: SafetyBannerType;
  onDismiss: () => void;
};

export default function SafetyBanner({ banner, onDismiss }: SafetyBannerProps) {
  return (
    <Alert variant={banner.variant}>
      <div className="safety">
        <div className="safety__content">
          <h3 className="safety__title">{banner.title}</h3>
          {banner.lines.map((line, index) => (
            <p key={`${banner.key}-${index}`} className="safety__line">
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
