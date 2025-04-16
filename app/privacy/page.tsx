import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | VeriLex AI',
  description:
    'Learn how VeriLex AI collects, uses, and protects your data. Our policy is designed for legal‑industry standards and full GDPR/CPRA compliance.',
  robots: { index: true, follow: true },
};

export default function PrivacyPolicy() {
  const effectiveDate = '16 April 2025';

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-50 text-slate-800 px-4">
      <header className="mx-auto max-w-5xl py-16 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">Privacy Policy</h1>
        <p className="text-sm text-slate-600">Effective {effectiveDate}</p>
      </header>

      <article className="prose prose-slate mx-auto max-w-3xl lg:max-w-4xl pb-24">
        <h2>1. Introduction</h2>
        <p>
          VeriLex AI (“<strong>VeriLex</strong>,” “<strong>we</strong>,” “<strong>us</strong>”)
          provides AI‑powered legal automation tools to solo attorneys and small
          law firms. This Privacy Policy explains how we collect, use, disclose,
          and safeguard your information when you visit&nbsp;
          <Link href="/" className="text-blue-600 underline">
            verilex.ai
          </Link>{' '}
          and any related applications or services (collectively, the “
          <strong>Platform</strong>”).
        </p>

        <h2>2. Scope</h2>
        <p>
          This policy applies to all visitors, wait‑list subscribers, beta
          testers, and customers worldwide and is designed to comply with:
        </p>
        <ul>
          <li>EU General Data Protection Regulation (<strong>GDPR</strong>)</li>
          <li>
            California Consumer Privacy Act &amp; Privacy Rights Act (
            <strong>CCPA/CPRA</strong>)
          </li>
          <li>ePrivacy Directive (EU Cookies Law)</li>
        </ul>

        <h2>3. Information We Collect</h2>
        <ul>
          <li>
            <strong>Account &amp; Contact Data </strong>—name, firm name, email
            address, and password hashes.
          </li>
          <li>
            <strong>Usage Data </strong>—log files, device/browser metadata,
            pages visited, and feature interactions (captured via Vercel
            Analytics after consent).
          </li>
          <li>
            <strong>Client Content </strong>—documents or text you upload for
            processing (encrypted at rest).
          </li>
          <li>
            <strong>Billing Data </strong>—handled exclusively by Stripe; we do
            not store full payment details.
          </li>
        </ul>

        <h2>4. Cookies &amp; Tracking</h2>
        <p>
          We use first‑party cookies to:
        </p>
        <ul>
          <li>Maintain secure sessions (Supabase Auth).</li>
          <li>
            Remember your cookie‑consent choice (<code>cookie_consent</code>).
          </li>
          <li>
            Collect aggregated analytics <em>only</em> after you click “Accept.”
          </li>
        </ul>
        <p>
          You can withdraw consent at any time by clearing cookies or adjusting
          preferences in our banner.
        </p>

        <h2>5. How We Use Your Data</h2>
        <ul>
          <li>Provide, operate, and improve the Platform.</li>
          <li>Send transactional emails (e.g., wait‑list confirmation).</li>
          <li>Respond to inquiries and support requests.</li>
          <li>
            Protect against fraud, abuse, and unauthorized access to legal
            documents.
          </li>
          <li>
            Comply with legal obligations and enforce our&nbsp;
            <Link href="/terms" className="text-blue-600 underline">
              Terms of Service
            </Link>
            .
          </li>
        </ul>

        <h2>6. Legal Bases (GDPR)</h2>
        <ul>
          <li>
            <strong>Contract</strong> — processing necessary to deliver agreed
            services.
          </li>
          <li>
            <strong>Consent</strong> — wait‑list marketing emails and optional
            analytics.
          </li>
          <li>
            <strong>Legitimate Interest</strong> — platform security and product
            improvement.
          </li>
        </ul>

        <h2>7. Data Retention</h2>
        <p>
          Account and wait‑list data are stored until you request deletion or
          twelve (12) months after inactivity, whichever comes first. Uploaded
          documents in beta are auto‑deleted 30 days after processing unless you
          choose to retain them.
        </p>

        <h2>8. Security Measures</h2>
        <ul>
          <li>End‑to‑end TLS 1.3 encryption in transit.</li>
          <li>Client content stored with AES‑256 encryption at rest.</li>
          <li>
            Role‑based access controls with Supabase Row‑Level Security (RLS).
          </li>
          <li>Quarterly penetration testing; SOC 2 Type II underway.</li>
        </ul>

        <h2>9. Your Rights</h2>
        <p>
          Depending on your location, you may have the right to access, correct,
          delete, or port your personal data and to object to or restrict
          certain processing. Submit requests via 
          <a
            href="mailto:privacy@verilex.ai"
            className="text-blue-600 underline"
          >
            privacy@verilex.ai
          </a>
          .
        </p>

        <h2>10. Third‑Party Services</h2>
        <p>
          We share data only with processors that meet our security standards,
          including:
        </p>
        <ul>
          <li>Supabase (US‑based database &amp; auth)</li>
          <li>Vercel (US hosting)</li>
          <li>Stripe (global payments)</li>
          <li>Postmark (transactional email)</li>
        </ul>
        <p>No data is sold or shared for advertising purposes.</p>

        <h2>11. International Transfers</h2>
        <p>
          Data may be processed outside your country. Where required, we rely on
          EU Standard Contractual Clauses (<abbr>SCC</abbr>) or similar adequacy
          mechanisms.
        </p>

        <h2>12. Children’s Privacy</h2>
        <p>
          VeriLex is not directed to individuals under 18. We do not knowingly
          collect data from minors. If you believe a minor has provided us data,
          contact us for deletion.
        </p>

        <h2>13. Policy Updates</h2>
        <p>
          We may amend this policy to reflect changes in law or our practices.
          Material updates will be emailed to account holders or highlighted on
          this page; the “Effective Date” above will change accordingly.
        </p>

        <h2>14. Contact</h2>
        <p>
          Questions, concerns, or requests? Email&nbsp;
          <a
            href="mailto:privacy@verilex.ai"
            className="text-blue-600 underline"
          >
            privacy@verilex.ai
          </a>{' '}
          or write to VeriLex AI LLC, 123 Peachtree St NE Suite 400,
          Atlanta, GA 30303 USA.
        </p>
      </article>
    </main>
  );
}
