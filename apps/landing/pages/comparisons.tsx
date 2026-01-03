import Head from 'next/head';
import Link from 'next/link';
import VerilexLogo from '@/components/VerilexLogo';
import ThemeToggle from '@/components/ThemeToggle';

const CELL_CLASS = 'border-b border-white/10 px-4 py-3 text-sm text-[color:var(--text-1)]';

export default function ComparisonsPage() {
  return (
    <>
      <Head>
        <title>VeriLex AI | How VeriLex Compares</title>
        <meta
          name="description"
          content="A neutral, transparent view of how VeriLex compares with legacy legal platforms."
        />
        <link rel="canonical" href="https://verilex.us/comparisons" />
      </Head>
      <div className="relative min-h-screen scroll-smooth bg-gradient-to-br from-[var(--g1)] via-[var(--g2)] to-[var(--g3)] text-[color:var(--text-1)]">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--surface-0)] backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main Navigation">
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded-lg">
              <VerilexLogo className="w-[150px] h-auto object-contain" />
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium sm:gap-6">
              <ThemeToggle />
              <Link href="/capabilities" className="hover:text-[color:var(--accent-soft)] transition-colors">Capabilities</Link>
              <Link href="/security" className="hover:text-[color:var(--accent-soft)] transition-colors">Security</Link>
              <span className="text-[color:var(--accent-soft)]">Comparisons</span>
              <Link href="/feedback" className="hover:text-[color:var(--accent-soft)] transition-colors">Feedback</Link>
              <Link href="/firm-intake" className="hover:text-[color:var(--accent-soft)] transition-colors">New Firm Intake</Link>
              <Link
                href="https://myclient.verilex.us/myclient/app"
                className="rounded-lg border border-[color:var(--accent-light)] px-4 py-1.5 text-[color:var(--accent-soft)] hover:bg-[color:var(--accent-light)] hover:text-white transition-all"
              >
                MyClient Portal
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">Comparisons</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[color:var(--text-0)]">How VeriLex Compares</h1>
            <p className="mt-4 text-lg text-[color:var(--text-2)]">
              There is no single best legal software for every firm. Platforms make tradeoffs based on who they’re built for.
              This page helps you understand those tradeoffs clearly.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Two Different Approaches to Legal Software</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Legacy all-in-one platforms aim to serve many firm sizes and practice types with broad feature sets,
                often including billing, accounting, and client portals. VeriLex focuses on a security-first operating system
                for solo attorneys and small firms, prioritizing clarity, access control, and modern UX.
              </p>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <h3 className="text-lg font-semibold text-[color:var(--text-0)]">What we optimize for</h3>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>Security-first workflows and firm-level isolation.</li>
                <li>Role-based access control that mirrors real firm structures.</li>
                <li>Opinionated simplicity over configuration sprawl.</li>
                <li>Clear case lifecycle visibility.</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-1)] shadow-2xl">
            <div className="grid grid-cols-4 gap-0 border-b border-white/10 bg-[var(--surface-0)] text-xs uppercase tracking-wide text-[color:var(--text-2)]">
              <div className="px-4 py-3">Feature Area</div>
              <div className="px-4 py-3">VeriLex (Now)</div>
              <div className="px-4 py-3">VeriLex (Coming)</div>
              <div className="px-4 py-3">Typical Legacy Platforms</div>
            </div>
            {[
              ['Firm-scoped access control', 'Enforced at the database layer', 'Expanded guardrails', 'Varies by product'],
              ['Role-based permissions', 'Admin / Attorney / Staff', 'More granularity planned', 'Often limited'],
              ['Case lifecycle clarity', 'Focused, firm-scoped views', 'Automation in development', 'Broader, more complex UX'],
              ['Document handling model', 'Private storage + controlled access', 'Advanced organization planned', 'Folder-based storage'],
              ['UI complexity', 'Opinionated and minimal', 'Guided workflows', 'Highly configurable'],
              ['Security enforcement layer', 'Server-side + RLS', 'Audit expansion planned', 'Mixed approaches'],
              ['Customization vs opinionated design', 'Opinionated by default', 'Flexible presets planned', 'Deep configuration'],
              ['Target firm size', 'Solo + small firms', 'Growing teams', 'All sizes'],
            ].map(([feature, now, coming, legacy]) => (
              <div key={feature} className="grid grid-cols-4 gap-0">
                <div className={CELL_CLASS}>{feature}</div>
                <div className={CELL_CLASS}>{now}</div>
                <div className={CELL_CLASS}>{coming}</div>
                <div className={CELL_CLASS}>{legacy}</div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Which Platform Is the Best Fit?</h2>
              <h3 className="mt-4 text-sm font-semibold text-[color:var(--text-0)]">VeriLex is a strong fit if…</h3>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>You are a solo attorney or small firm.</li>
                <li>You value security and access control.</li>
                <li>You prefer clarity over excessive configuration.</li>
                <li>You want to influence the product’s roadmap.</li>
              </ul>
            </section>
            <section className="rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <h3 className="text-sm font-semibold text-[color:var(--text-0)]">Other platforms may be a better fit if…</h3>
              <ul className="mt-3 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>You require built-in billing/accounting today.</li>
                <li>You need extensive practice-area-specific tooling immediately.</li>
                <li>You prefer a highly configurable, all-in-one system.</li>
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Platforms Firms Commonly Compare Us Against</h2>
            <p className="mt-3 text-sm text-[color:var(--text-1)]">
              Clio, MyCase, and PracticePanther are commonly compared. These platforms serve many firms well. VeriLex takes a
              different approach focused on security-first workflows and modern simplicity.
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Looking Ahead</h2>
            <p className="mt-3 text-sm text-[color:var(--text-1)]">
              VeriLex is evolving incrementally. Advanced automation, expanded practice support, and client-facing tools are
              planned and in development. Firms using VeriLex today help shape what comes next.
            </p>
          </section>

          <div className="mt-10 text-center">
            <p className="text-sm text-[color:var(--text-2)]">Still deciding?</p>
            <Link
              href="/feedback"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-white font-semibold shadow-lg transition-all hover:bg-[color:var(--accent)] hover:scale-[1.02]"
            >
              Share Feedback
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
