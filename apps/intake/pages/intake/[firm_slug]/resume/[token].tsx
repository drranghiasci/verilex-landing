import { useState } from 'react';
import { useRouter } from 'next/router';
import IntakeFlow from '../../../../components/intake/IntakeFlow';

export default function IntakeResumePage() {
  const router = useRouter();
  const firmSlug = typeof router.query.firm_slug === 'string' ? router.query.firm_slug : 'intake';
  const token = typeof router.query.token === 'string' ? router.query.token : undefined;
  const [status, setStatus] = useState<'draft' | 'submitted' | null>(null);

  return (
    <IntakeFlow
      firmSlug={firmSlug}
      mode="resume"
      initialToken={token}
      onStatusChange={setStatus}
    />
  );
}

