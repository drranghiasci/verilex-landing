type IntakeHeaderProps = {
  status?: 'draft' | 'submitted' | null;
  firmName?: string;
  branding?: {
    logo_url?: string;
    accent_color?: string;
  };
};

export default function IntakeHeader({ status, firmName, branding }: IntakeHeaderProps) {
  const statusLabel =
    status === 'submitted' ? 'Submitted & locked' : status === 'draft' ? 'Draft saved' : 'Draft not started';
  const statusClass =
    status === 'submitted' ? 'status-pill--submitted' : status === 'draft' ? 'status-pill--draft' : '';
  const displayName = firmName?.trim() || 'Verilex';
  const logoUrl = branding?.logo_url?.trim();

  return (
    <header className="shell__header">
      <div>
        {logoUrl ? (
          <img className="shell__logo" src={logoUrl} alt={`${displayName} logo`} />
        ) : (
          <p className="shell__eyebrow">{displayName}</p>
        )}
        <h1 className="shell__title">Georgia Divorce &amp; Custody Intake</h1>
      </div>
      <div className={`status-pill ${statusClass}`}>{statusLabel}</div>
    </header>
  );
}
