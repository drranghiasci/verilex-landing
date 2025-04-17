import Head from 'next/head';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | VeriLex AI',
  description:
    'Learn how VeriLex AI collects, uses, and protects your data in compliance with GDPR, CPRA, and legal‑industry standards.',
  robots: { index: true, follow: true },
};

export default function PrivacyPolicy() {
  const effectiveDate = 'April 16, 2025';
  const toc = [
    { id: 'intro',       title: '1. Introduction' },
    { id: 'scope',       title: '2. Scope' },
    { id: 'collect',     title: '3. Information We Collect' },
    { id: 'cookies',     title: '4. Cookies & Tracking' },
    { id: 'use',         title: '5. How We Use Your Data' },
    { id: 'legal-bases', title: '6. Legal Bases (GDPR)' },
    { id: 'retention',   title: '7. Data Retention' },
    { id: 'security',    title: '8. Security Measures' },
    { id: 'rights',      title: '9. Your Rights' },
    { id: 'third',       title: '10. Third‑Party Services' },
    { id: 'transfers',   title: '11. International Transfers' },
    { id: 'children',    title: '12. Children’s Privacy' },
    { id: 'updates',     title: '13. Policy Updates' },
    { id: 'contact',     title: '14. Contact' },
  ];

  return (
    <>
      <Head>
        <title>Privacy Policy | VeriLex AI</title>
      </Head>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Effective&nbsp;{effectiveDate}
          </p>
        </header>

        {/* ─── centred two‑column grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(auto,1fr)_260px] justify-center lg:gap-16 gap-10">
          {/* Main article first */}
          <article className="space-y-12 text-base leading-relaxed lg:pr-8 lg:max-w-3xl lg:mx-auto">
            {/* 1. Introduction */}
            <section id="intro" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                VeriLex AI (<strong>“VeriLex,” “we,” “us”</strong>) provides AI‑powered legal
                automation tools to solo attorneys and small firms. This Privacy Policy explains how
                we collect, use, disclose, and safeguard your information when you access&nbsp;
                <Link href="/" className="text-primary underline underline-offset-2">
                  verilex.ai
                </Link>{' '}
                and related applications or services (the <strong>“Platform”</strong>).
              </p>
            </section>

            {/* 2. Scope */}
            <section id="scope" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">2. Scope</h2>
              <p>
                This policy applies to all visitors, wait‑list subscribers, beta testers, and
                customers worldwide. It is designed to comply with, among others:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>EU General Data Protection Regulation (<strong>GDPR</strong>)</li>
                <li>California Consumer Privacy &amp; Rights Acts (<strong>CCPA/CPRA</strong>)</li>
                <li>ePrivacy Directive (EU Cookies Law)</li>
              </ul>
            </section>

            {/* 3. Information We Collect */}
            <section id="collect" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">3. Information We Collect</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Account &amp; Contact Data —</strong> name, firm, email address, password
                  hashes.
                </li>
                <li>
                  <strong>Usage Data —</strong> log files, device/browser metadata, pages visited,
                  feature interactions (captured only after consent).
                </li>
                <li>
                  <strong>Client Content —</strong> documents or text you upload for processing
                  (encrypted at rest).
                </li>
                <li>
                  <strong>Billing Data —</strong> handled by Stripe; we never store full card
                  details.
                </li>
              </ul>
            </section>

            {/* 4. Cookies */}
            <section id="cookies" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">4. Cookies &amp; Tracking</h2>
              <p>We use first‑party cookies to:</p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>Maintain secure sessions (Supabase Auth).</li>
                <li>Remember your cookie‑consent choice (<code>cookie_consent</code>).</li>
                <li>Collect aggregated analytics <em>only</em> after you consent.</li>
              </ul>
              <p className="mt-4">
                Withdraw consent anytime by clearing cookies or adjusting preferences in our banner.
              </p>
            </section>

            {/* 5. Use */}
            <section id="use" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">5. How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide, operate, and improve the Platform.</li>
                <li>Send transactional emails (e.g., wait‑list confirmation).</li>
                <li>Respond to inquiries and support requests.</li>
                <li>Protect against fraud, abuse, and unauthorized access.</li>
                <li>
                  Comply with legal obligations and enforce our&nbsp;
                  <Link href="/terms" className="text-primary underline underline-offset-2">
                    Terms of Use
                  </Link>
                  .
                </li>
              </ul>
            </section>

            {/* 6. Legal Bases */}
            <section id="legal-bases" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">6. Legal Bases (GDPR)</h2>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Contract</strong> — processing necessary to deliver agreed services.</li>
                <li><strong>Consent</strong> — wait‑list marketing e‑mails and optional analytics.</li>
                <li>
                  <strong>Legitimate Interest</strong> — platform security and product improvement.
                </li>
              </ul>
            </section>

            {/* 7. Retention */}
            <section id="retention" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
              <p>
                Account data is stored until you request deletion or 12 months after inactivity,
                whichever comes first. Beta‑uploaded documents are auto‑deleted 30 days after
                processing unless you opt to retain them.
              </p>
            </section>

            {/* 8. Security */}
            <section id="security" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">8. Security Measures</h2>
              <ul className="list-disc list-inside space-y-1">
                <li>TLS 1.3 encryption in transit; AES‑256 encryption at rest.</li>
                <li>Role‑based access controls with Supabase Row‑Level Security.</li>
                <li>Quarterly penetration tests; SOC 2 Type II audit in progress.</li>
              </ul>
            </section>

            {/* 9. Rights */}
            <section id="rights" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
              <p>
                Depending on your jurisdiction, you may have the right to access, correct, delete,
                or port your personal data, and to object to certain processing. Submit requests to&nbsp;
                <a
                  href="mailto:privacy@verilex.ai"
                  className="text-primary underline underline-offset-2"
                >
                  privacy@verilex.ai
                </a>
                .
              </p>
            </section>

            {/* 10. Third‑party */}
            <section id="third" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">10. Third‑Party Services</h2>
              <p>We share data only with processors that meet our security standards:</p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>Supabase (database &amp; auth, USA)</li>
                <li>Vercel (hosting, USA)</li>
                <li>Stripe (global payments)</li>
                <li>Postmark (transactional e‑mail)</li>
              </ul>
              <p className="mt-4">We do not sell data or share it for advertising.</p>
            </section>

            {/* 11. Transfers */}
            <section id="transfers" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">11. International Transfers</h2>
              <p>
                Data may be processed outside your country. Where required, we rely on EU Standard
                Contractual Clauses (SCCs) or other adequacy mechanisms.
              </p>
            </section>

            {/* 12. Children */}
            <section id="children" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">12. Children’s Privacy</h2>
              <p>
                VeriLex AI is not directed to individuals under 18. We do not knowingly collect
                data from minors. If you believe a minor has provided data, contact us for deletion.
              </p>
            </section>

            {/* 13. Updates */}
            <section id="updates" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">13. Policy Updates</h2>
              <p>
                We may amend this policy to reflect legal or operational changes. Material updates
                will be e‑mailed to account holders or highlighted on this page; the “Effective
                Date” above will change accordingly.
              </p>
            </section>

            {/* 14. Contact */}
            <section id="contact" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">14. Contact</h2>
              <p>
                Questions or requests? Write to&nbsp;
                <a
                  href="mailto:privacy@verilex.ai"
                  className="text-primary underline underline-offset-2"
                >
                  privacy@verilex.ai
                </a>{' '}
                or VeriLex AI LLC, 123 Peachtree St NE Suite 400,
                Atlanta, GA 30303 USA.
              </p>
            </section>

            {/* Footer */}
            <footer className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} VeriLex AI, LLC — All rights reserved.
              </p>
            </footer>
          </article>

          {/* Sidebar second */}
          <nav className="hidden lg:block sticky top-24 self-start">
            <ul className="space-y-2 text-sm leading-6">
              {toc.map(({ id, title }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors"
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
