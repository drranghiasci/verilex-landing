import Head from 'next/head';
import Link from 'next/link';
import VerilexLogo from '@/components/VerilexLogo';
import ThemeToggle from '@/components/ThemeToggle';

const SECTION_CLASS = 'rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl';

export default function SecurityPage() {
  return (
    <>
      <Head>
        <title>VeriLex AI | Security by Design</title>
        <meta
          name="description"
          content="Security by design for law firms: access control, data isolation, and server-side enforcement."
        />
        <link rel="canonical" href="https://verilex.us/security" />
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
              <span className="text-[color:var(--accent-soft)]">Security</span>
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
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">Security</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[color:var(--text-0)]">Security by Design</h1>
            <p className="mt-4 text-lg text-[color:var(--text-2)]">
              VeriLex was built with security as a foundational requirement, not an afterthought.
              Law firms handle sensitive data, and our platform is designed to respect that responsibility.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Our Security Principles</h2>
              <ul className="mt-4 space-y-2 text-sm text-[color:var(--text-1)]">
                <li>Least-privilege access at every layer.</li>
                <li>Firm-level data isolation by default.</li>
                <li>Server-side enforcement of sensitive operations.</li>
                <li>Auditability and traceability for key actions.</li>
                <li>Incremental hardening as the platform scales.</li>
              </ul>
            </section>
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Access Control & Permissions</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Access is scoped to a firm and refined by role (Admin, Attorney, Staff). Permissions are enforced at the
                database layer using Row Level Security, and the UI mirrors those rules so there is no security by UI only.
              </p>
            </section>
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Data Isolation & Firm Boundaries</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Each firm’s data is logically isolated. Users cannot access information outside their firm, and queries
                are automatically scoped by firm membership with server-side enforcement.
              </p>
            </section>
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Document Security</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Documents are stored in private buckets, access is validated against firm membership, and we do not
                expose public document URLs. Uploads and downloads are mediated through server endpoints.
              </p>
            </section>
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Server-Side Enforcement</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Sensitive writes are handled server-side. Client apps do not get direct write access to protected tables,
                reducing attack surface and accidental exposure.
              </p>
            </section>
            <section className={SECTION_CLASS}>
              <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Authentication & Account Security</h2>
              <p className="mt-3 text-sm text-[color:var(--text-1)]">
                Authentication is handled through Supabase Auth with email-based verification and recovery flows.
                Sessions are managed with expiration and refresh, and firm access is invite-only during beta.
              </p>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">What This Does — and Does Not — Mean</h2>
            <p className="mt-3 text-sm text-[color:var(--text-1)]">
              VeriLex is not yet SOC 2 certified. Our security posture reflects the current architecture and
              continues to evolve as the platform grows.
            </p>
          </section>

          <section className="mt-6 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-xl font-semibold text-[color:var(--text-0)]">Security Roadmap</h2>
            <p className="mt-3 text-sm text-[color:var(--text-1)]">
              Planned work includes continuous hardening, expanded audit logging, and formal compliance pathways
              (including SOC 2) as the platform matures.
            </p>
          </section>

          <div className="mt-10 text-center">
            <p className="text-sm text-[color:var(--text-2)]">Have security questions?</p>
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
