import Card from '../ui/Card';

type LockedConfirmationProps = {
  submittedAt?: string | null;
};

export default function LockedConfirmation({ submittedAt }: LockedConfirmationProps) {
  const submittedText = submittedAt ? `on ${new Date(submittedAt).toLocaleDateString()}` : '';
  return (
    <Card className="locked">
      <div className="locked__header">
        <div className="locked__badge">Locked</div>
        <h2>Submission confirmed</h2>
      </div>
      <p className="muted">
        Your intake was submitted {submittedText}. This intake is now locked and cannot be edited.
      </p>
      <div className="locked__footer">
        <span>Need to make changes?</span>
        <span className="muted">Contact the firm directly.</span>
      </div>
    </Card>
  );
}
