import type { ConsistencyWarning } from '../../../../lib/intake/consistencyChecks';
import Button from '../ui/Button';
import Alert from '../ui/Alert';

export type WarningItem = {
  warning: ConsistencyWarning;
  sections?: Array<{ id: string; title: string }>;
};

type WarningsPanelProps = {
  items: WarningItem[];
  title?: string;
  onJump?: (sectionId: string) => void;
};

export default function WarningsPanel({
  items,
  title = 'These answers may not match. Review?',
  onJump,
}: WarningsPanelProps) {
  if (items.length === 0) return null;

  return (
    <Alert variant="info">
      <div className="warning__header">
        <h3 className="warning__title">{title}</h3>
        <span className="warning__count">{items.length} warning(s)</span>
      </div>
      <div className="warning__list">
        {items.map((item, index) => (
          <div key={`${item.warning.key}-${index}`} className="warning__item">
            <div className="warning__message">{item.warning.message}</div>
            {onJump && item.sections && item.sections.length > 0 && (
              <div className="warning__actions">
                {item.sections.map((section) => (
                  <Button
                    key={section.id}
                    variant="unstyled"
                    className="warning__action"
                    onClick={() => onJump(section.id)}
                  >
                    Review {section.title}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Alert>
  );
}
