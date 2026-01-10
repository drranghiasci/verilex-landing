import { useState } from 'react';
import { useRouter } from 'next/router';
import IntakeFlow from '../../../../components/intake/IntakeFlow';
import IntakeShell from '../../../../components/intake/IntakeShell';
import type { ResolveFirmResponse } from '../../../../../lib/intake/intakeApi';

export default function IntakeResumePage() {
  const router = useRouter();
  const firmSlug = typeof router.query.firm_slug === 'string' ? router.query.firm_slug : 'intake';
  const token = typeof router.query.token === 'string' ? router.query.token : undefined;
  const [status, setStatus] = useState<'draft' | 'submitted' | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);
  const [branding, setBranding] = useState<ResolveFirmResponse['branding'] | null>(null);

  return (
    <IntakeShell title="Verilex Intake Resume" status={status} firmName={firmName} branding={branding}>
      {status === 'submitted' && (
        <div className="banner success">
          This intake has already been submitted and is locked.
        </div>
      )}
      <IntakeFlow
        firmSlug={firmSlug}
        mode="resume"
        initialToken={token}
        onStatusChange={setStatus}
        onFirmResolved={(firm) => {
          setFirmName(firm?.firm_name ?? null);
          setBranding(firm?.branding ?? null);
        }}
      />
    </IntakeShell>
  );
}
