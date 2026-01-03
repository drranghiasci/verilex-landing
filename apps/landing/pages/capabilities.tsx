import Head from 'next/head';
import Link from 'next/link';
import VerilexLogo from '@/components/VerilexLogo';
import ThemeToggle from '@/components/ThemeToggle';

const SECTION_CLASS = 'rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl';

export default function CapabilitiesPage() {
  return (
    <>
      <Head>
        <title>VeriLex AI | Platform Capabilities</title>
        <meta
          name="description"
          content="Platform capabilities across phases: secure foundation today, workflow automation, and long-term vision."
        />
        <link rel="canonical" href="https://verilex.us/capabilities" />
      </Head>
      <div className="relative min-h-screen scroll-smooth bg-gradient-to-br from-[var(--g1)] via-[var(--g2)] to-[var(--g3)] text-[color:var(--text-1)]">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--surface-0)] backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main Navigation">
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded-lg">
              <VerilexLogo className="w-[150px] h-auto object-contain" />
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium sm:gap-6">
              <ThemeToggle />
              <span className="text-[color:var(--accent-soft)]">Capabilities</span>
              <Link href="/security" className="hover:text-[color:var(--accent-soft)] transition-colors">Security</Link>
              <Link href="/comparisons" className="hover:text-[color:var(--accent-soft)] transition-colors">Comparisons</Link>
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
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">Capabilities</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[color:var(--text-0)]">Platform Capabilities</h1>
            <p className="mt-4 text-lg text-[color:var(--text-2)]">
              VeriLex is being built in phases. Each phase expands capability while maintaining security and clarity.
              Early adopters get a stable core today and influence what comes next.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Phase 1: Secure Foundation</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Available today</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>Firm onboarding and access control</li>
                <li>Role-based permissions (Admin / Attorney / Staff)</li>
                <li>Guided case intake</li>
                <li>Active case management</li>
                <li>Secure document handling</li>
                <li>Firm-scoped dashboards</li>
                <li>Clean, modern user experience</li>
              </ul>
              <p className="mt-4 text-sm text-[color:var(--text-2)]">
                The focus is stability, security, and core workflows done well.
              </p>
            </section>

            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Phase 2: Workflow Automation</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">In development</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>Smarter intake automation</li>
                <li>Reduced manual data entry</li>
                <li>Structured case workflows</li>
                <li>Internal tasking and reminders</li>
                <li>Deeper activity tracking</li>
              </ul>
            </section>

            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Phase 3: Intelligence & Expansion</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Planned</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>AI-assisted summaries and drafting support</li>
                <li>Expanded practice-area support</li>
                <li>Enhanced reporting and insights</li>
                <li>Optional client-facing portals</li>
              </ul>
            </section>

            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Phase 4: A Modern Legal Operating System</h2>
              <p className="mt-2 text-sm text-[color:var(--text-2)]">Vision</p>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>A unified, secure platform for firm operations</li>
                <li>Clear data ownership and access control</li>
                <li>Deep integration across workflows</li>
                <li>Flexible enough to grow with a firm</li>
              </ul>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">What Guides Our Roadmap</h2>
            <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
              <li>Security before scale</li>
              <li>Clarity over complexity</li>
              <li>Firm-driven development</li>
              <li>Incremental, reliable releases</li>
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">About This Roadmap</h2>
            <p className="mt-3 text-sm text-[color:var(--text-1)]">
              Timelines may evolve as we learn from partner firms. Features roll out incrementally, and firm feedback
              directly influences prioritization.
            </p>
          </section>

          <div className="mt-10 text-center">
            <p className="text-sm text-[color:var(--text-2)]">Help shape what comes next.</p>
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
