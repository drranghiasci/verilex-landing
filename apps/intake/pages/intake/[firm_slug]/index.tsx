import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import IntakeFlow from '../../../components/intake/IntakeFlow';
import IntakeLanding from '../../../components/intake/IntakeLanding';

export default function IntakeStartPage() {
  const router = useRouter();
  const firmSlug = typeof router.query.firm_slug === 'string' ? router.query.firm_slug : 'intake';
  const initialToken = typeof router.query.token === 'string' ? router.query.token : undefined;
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'draft' | 'in_progress' | 'ready_for_review' | 'submitted' | null>(null);

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

  // Landing Page Mode (No token)
  if (mode === 'new') {
    return (
      <IntakeLanding
        firmSlug={firmSlug}
        firmName={undefined}
        onStart={(token) => {
          const storageKey = `intake:token:${firmSlug}`;
          window.localStorage.setItem(storageKey, token);
          setResumeToken(token);
        }}
      />
    );
  }

  // Intake Experience Mode (Active token)
  return (
    <IntakeFlow
      firmSlug={firmSlug}
      mode={mode}
      initialToken={resolvedToken}
      onStatusChange={setStatus}
    />
  );
}

