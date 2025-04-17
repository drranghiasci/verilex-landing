'use client';

import Head from 'next/head';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Use | VeriLex AI',
  description:
    'Review the Terms of Use for VeriLex AI, the secure AI‑powered legal assistant platform.',
  robots: { index: true, follow: true },
};

export default function TermsOfUse() {
  const updated = 'April 17, 2025';
  const toc = [
    { id: 'about',       title: '1. About VeriLex AI' },
    { id: 'eligibility', title: '2. Eligibility & Account Registration' },
    { id: 'use',         title: '3. Permitted Use' },
    { id: 'data',        title: '4. Data & Confidentiality' },
    { id: 'beta',        title: '5. Beta Access & Waitlist' },
    { id: 'ip',          title: '6. Intellectual Property' },
    { id: 'termination', title: '7. Termination' },
    { id: 'disclaimers', title: '8. Disclaimers' },
    { id: 'liability',   title: '9. Limitation of Liability' },
    { id: 'changes',     title: '10. Changes to These Terms' },
    { id: 'law',         title: '11. Governing Law & Venue' },
    { id: 'contact',     title: '12. Contact' },
  ];

  return (
    <>
      <Head>
        <title>Terms of Use | VeriLex AI</title>
      </Head>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight">Terms of Use</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Last updated: {updated}</p>
        </header>

        {/* ─── centred two‑column grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(auto,1fr)] justify-center lg:gap-16 gap-10">
          {/* Sidebar */}
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

          {/* Main article */}
          <article className="space-y-12 text-base leading-relaxed lg:pr-8 lg:max-w-3xl lg:mx-auto">
            {/* 1. About */}
            <section id="about" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">1. About VeriLex AI</h2>
              <p>
                VeriLex AI is a secure, AI‑powered legal workflow platform built for solo attorneys
                and small firms. Our tools help streamline client intake, manage case data, and
                automate legal documentation—starting with divorce and family law and expanding into
                additional practice areas.
              </p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>AI‑powered Client Intake Forms</li>
                <li>Active Cases Dashboard with filters & analytics</li>
                <li>Individual Case Views with uploads, notes, and export tools</li>
                <li>Responsive, mobile‑optimized design</li>
                <li>Print‑ready PDFs, court countdowns, and more</li>
              </ul>
            </section>

            {/* 2. Eligibility */}
            <section id="eligibility" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">
                2. Eligibility&nbsp;&amp; Account Registration
              </h2>
              <p>To create or access a VeriLex AI account, you must:</p>
              <ol className="mt-4 list-decimal list-inside space-y-1">
                <li>Be at least 18 years old;</li>
                <li>Be a licensed attorney or an authorized representative of a legal practice;</li>
                <li>Provide complete, current, and accurate registration information; and</li>
                <li>Keep your login credentials confidential.</li>
              </ol>
              <p className="mt-4">
                You are responsible for all activity under your account. Report unauthorized use
                immediately to&nbsp;
                <Link
                  href="mailto:founder@verilex.us"
                  className="text-primary underline underline-offset-2"
                >
                  founder@verilex.us
                </Link>
                .
              </p>
            </section>

            {/* 3. Permitted Use */}
            <section id="permitted-use" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">3. Permitted Use</h2>
              <p>
                You may use VeriLex AI solely for lawful purposes related to legal case management
                within your practice. You agree <strong>not</strong> to:
              </p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>Engage in unauthorized or unethical legal practice;</li>
                <li>Upload false, harmful, or infringing content;</li>
                <li>Employ bots, scrapers, or other unauthorized automation tools; or</li>
                <li>Reverse‑engineer, probe, or disrupt the platform.</li>
              </ul>
            </section>

            {/* 4. Data */}
            <section id="data" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">4. Data&nbsp;&amp; Confidentiality</h2>
              <p>
                While VeriLex AI is <em>not</em> a law firm and does not provide legal advice, we
                implement 256‑bit encryption, segregated databases, and strict access controls to
                safeguard your data.
              </p>
              <p className="mt-4">
                You are solely responsible for ensuring that all data shared through VeriLex AI
                complies with applicable privacy, confidentiality, and professional‑ethics rules in
                your jurisdiction.
              </p>
            </section>

            {/* 5. Beta */}
            <section id="beta" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">5. Beta Access&nbsp;&amp; Waitlist</h2>
              <p>
                If you participate in our Beta Program, you acknowledge that the software may be
                incomplete, unstable, or subject to change. We may contact you for feedback and may
                limit or revoke access at any time.
              </p>
              <p className="mt-4">
                Beta participation does not guarantee future access to paid features but may include
                early discounts at our discretion.
              </p>
            </section>

            {/* 6. IP */}
            <section id="ip" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              <p>
                All platform code, designs, branding, and content (excluding user content) are the
                intellectual property of VeriLex AI, LLC. You may not copy, modify, or redistribute
                any part of the Service without prior written consent.
              </p>
            </section>

            {/* 7. Termination */}
            <section id="termination" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">7. Termination</h2>
              <p>We reserve the right to suspend or terminate your access without notice if:</p>
              <ul className="mt-4 list-disc list-inside space-y-1">
                <li>You breach these Terms;</li>
                <li>Your use poses risk to the platform or other users; or</li>
                <li>We discontinue the Service.</li>
              </ul>
              <p className="mt-4">All rights granted to you will cease upon termination.</p>
            </section>

            {/* 8. Disclaimers */}
            <section id="disclaimers" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">8. Disclaimers</h2>
              <p>
                VeriLex AI does <strong>not</strong> provide legal advice. The Service is offered “as
                is” and “as available,” without warranties of any kind, express or implied.
              </p>
            </section>

            {/* 9. Liability */}
            <section id="liability" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, VeriLex AI will not be liable for indirect,
                incidental, special, or consequential damages—including lost profits or data—arising
                from your use of the Service.
              </p>
            </section>

            {/* 10. Changes */}
            <section id="changes" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">10. Changes to These Terms</h2>
              <p>
                We may update these Terms periodically. If changes are material, we will notify you
                by e‑mail or in‑app notice. Continued use of the Service after changes become
                effective constitutes acceptance of the updated Terms.
              </p>
            </section>

            {/* 11. Law */}
            <section id="law" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">
                11. Governing Law&nbsp;&amp; Venue
              </h2>
              <p>
                These Terms are governed by the laws of the State of Georgia, USA. Any legal action
                must be filed in the state or federal courts located in Fulton County, Georgia.
              </p>
            </section>

            {/* 12. Contact */}
            <section id="contact" className="scroll-mt-28">
              <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
              <p>
                Questions or concerns? Reach our legal team at:
                <br />
                <strong>VeriLex AI, LLC</strong>
                <br />
                <Link
                  href="mailto:founder@verilex.us"
                  className="text-primary underline underline-offset-2"
                >
                  founder@verilex.us
                </Link>
              </p>
            </section>

            {/* Footer */}
            <footer className="pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} VeriLex AI, LLC — All rights reserved.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </>
  );
}
