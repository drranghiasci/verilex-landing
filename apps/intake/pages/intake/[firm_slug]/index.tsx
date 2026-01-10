import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import IntakeFlow from '../../../components/intake/IntakeFlow';
import IntakeShell from '../../../components/intake/IntakeShell';
import type { ResolveFirmResponse } from '../../../../../lib/intake/intakeApi';

export default function IntakeStartPage() {
  const router = useRouter();
  const firmSlug = typeof router.query.firm_slug === 'string' ? router.query.firm_slug : 'intake';
  const initialToken = typeof router.query.token === 'string' ? router.query.token : undefined;
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'submitted' | null>(null);
  const [firmName, setFirmName] = useState<string | null>(null);
  const [branding, setBranding] = useState<ResolveFirmResponse['branding'] | null>(null);

  useEffect(() => {
    if (!router.isReady || typeof window === 'undefined') return;
    const forceNew = router.query.new === '1' || router.query.new === 'true';
    const storageKey = `intake:token:${firmSlug}`;
    if (forceNew) {
      window.localStorage.removeItem(storageKey);
      setResumeToken(null);
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    setResumeToken(stored);
  }, [firmSlug, router.isReady, router.query.new]);

  const resolvedToken = initialToken ?? resumeToken ?? undefined;
  const mode: 'new' | 'resume' = resolvedToken ? 'resume' : 'new';

  return (
    <IntakeShell title="Verilex Intake" status={status} firmName={firmName} branding={branding}>
      <IntakeFlow
        firmSlug={firmSlug}
        mode={mode}
        initialToken={resolvedToken}
        onStatusChange={setStatus}
        onFirmResolved={(firm) => {
          setFirmName(firm?.firm_name ?? null);
          setBranding(firm?.branding ?? null);
        }}
      />
    </IntakeShell>
  );
}
