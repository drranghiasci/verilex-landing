import Head from 'next/head';
import { useFirm } from '@/lib/FirmProvider';

export default function IntakePage() {
  const { state } = useFirm();

  return (
    <>
      <Head>
        <title>MyClient | Intake</title>
      </Head>
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">New Intake</h1>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Firm {state.firmId ? state.firmId.slice(0, 8) : 'No firm'} · Role {state.role ?? 'member'}
        </p>
        <p className="mt-6 text-[color:var(--text-2)]">Coming soon.</p>
      </div>
    </>
  );
}
