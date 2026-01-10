import Alert from '../ui/Alert';

type ErrorBannerProps = {
  message?: string | null;
  requestId?: string | null;
};

export default function ErrorBanner({ message, requestId }: ErrorBannerProps) {
  if (!message) return null;

  return (
    <Alert variant="error">
      <div>{message}</div>
      {requestId && <div className="muted">Reference ID: {requestId}</div>}
    </Alert>
  );
}
