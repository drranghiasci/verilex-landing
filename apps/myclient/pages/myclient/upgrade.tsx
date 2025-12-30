import Head from 'next/head';
import Link from 'next/link';
import { useFirm } from '@/lib/FirmProvider';
import { useFirmPlan } from '@/lib/useFirmPlan';
import { PLAN_LIMITS } from '@/lib/plans';

export default function UpgradePage() {
  const { state } = useFirm();
  const { plan, loading } = useFirmPlan();

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const freeLimits = PLAN_LIMITS.free!;

  return (
    <>
      <Head>
        <title>MyClient | Upgrade</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link href="/myclient/app" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
            ← Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-white">Upgrade</h1>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">
            Choose the plan that fits your firm. Billing is coming soon.
          </p>
        </div>

        {!state.authed && <p className="text-[color:var(--text-2)]">Please sign in.</p>}
        {state.authed && loading && <p className="text-[color:var(--text-2)]">Loading plan...</p>}

        {state.authed && !loading && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Free</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Great for getting started.</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-2)]">
                <li>Up to {freeLimits.maxCases} cases</li>
                <li>Up to {freeLimits.maxMembers} members</li>
                <li>Up to {freeLimits.maxDocuments} documents</li>
              </ul>
              {plan === 'free' && (
                <p className="mt-4 text-xs uppercase tracking-wide text-[color:var(--accent-light)]">
                  Current plan
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-[color:var(--accent)] bg-[var(--surface-1)] p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">Pro</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Unlimited cases, members, and documents.</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-2)]">
                <li>Unlimited cases</li>
                <li>Unlimited members</li>
                <li>Unlimited documents</li>
              </ul>
              {plan === 'pro' ? (
                <p className="mt-4 text-xs uppercase tracking-wide text-[color:var(--accent-light)]">
                  Current plan
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Contact us
                </button>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-6">
              <h2 className="text-lg font-semibold text-white">Enterprise</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Custom onboarding and support.</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-2)]">
                <li>Unlimited usage</li>
                <li>Dedicated support</li>
                <li>Custom security review</li>
              </ul>
              {plan === 'enterprise' ? (
                <p className="mt-4 text-xs uppercase tracking-wide text-[color:var(--accent-light)]">
                  Current plan
                </p>
              ) : (
                <button
                  type="button"
                  className="mt-4 w-full rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white"
                >
                  Contact us
                </button>
              )}
            </div>
          </div>
        )}

        {state.authed && !loading && (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface-1)] p-6 text-sm text-[color:var(--text-2)]">
            You are currently on the {planLabel} plan. Self-serve billing is coming soon.
          </div>
        )}
      </div>
    </>
  );
}
