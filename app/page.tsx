'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import WaitlistForm from '@/components/WaitlistForm';
import { Analytics } from '@vercel/analytics/react';

/**
 * Simple countdown hook — recalculates every second
 */
function useCountdown(targetDate: Date) {
  const calculate = () => {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;

    return {
      months: Math.max(0, Math.floor(distance / (1000 * 60 * 60 * 24 * 30))),
      days: Math.max(0, Math.floor((distance % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24))),
      hours: Math.max(0, Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
      minutes: Math.max(0, Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))),
      seconds: Math.max(0, Math.floor((distance % (1000 * 60)) / 1000)),
    } as const;
  };

  const [timeLeft, setTimeLeft] = useState(calculate);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(calculate()), 1000);
    return () => clearInterval(interval);
  }, []);

  return timeLeft;
}

export default function Home() {
  // ──────────────────────────────────────────────────────────────────────────────
  // Config
  // ──────────────────────────────────────────────────────────────────────────────
  const launchDate = new Date('2025-10-01T16:00:00Z'); // 12:00‑pm EDT (16:00 UTC)
  const timeLeft = useCountdown(launchDate);

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* SEO & Social Meta */}
      <Head>
        <title>VeriLex AI | AI‑Powered Legal Assistant for Solo & Small Firms</title>
        <meta
          name="description"
          content="Join the waitlist for VeriLex AI — the smart legal assistant that automates research, case summarization, and contract review so you can focus on clients."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://verilex.ai/" />

        {/* Open Graph / Twitter */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="VeriLex AI | AI‑Powered Legal Assistant" />
        <meta property="og:description" content="Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms." />
        <meta property="og:url" content="https://verilex.ai/" />
        <meta property="og:image" content="https://verilex.ai/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'VeriLex AI',
              operatingSystem: 'Web',
              applicationCategory: 'LegalService',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/PreOrder',
              },
              url: 'https://verilex.ai/',
              logo: 'https://verilex.ai/verilex-logo-name.png',
              description:
                'AI‑powered legal assistant that automates research, case summarization, and contract review for solo attorneys and small firms.',
            }),
          }}
        />
      </Head>

      {/* Page */}
      <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 scroll-smooth">
        {/* Header */}
        <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
          <nav
            aria-label="Main Navigation"
            className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3"
          >
            <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">
              <Image
                src="/verilex-logo-name.png"
                alt="VeriLex AI logo"
                width={170}
                height={60}
                priority
              />
            </Link>
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link
                href="#waitlist"
                className="text-gray-700 hover:text-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Join Waitlist
              </Link>
              <Link
                href="/dashboard"
                className="text-blue-600 hover:text-blue-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Beta Test Build
              </Link>
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-4xl px-4 pt-32 text-center">
          {/* Hero */}
          <section aria-label="Hero" className="mb-14">
            <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl">
              Your AI‑Powered Legal Assistant
            </h1>
            <p className="mb-10 text-lg text-gray-700 md:text-xl">
              Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
            </p>
            <div id="waitlist" className="mx-auto mb-12 w-full max-w-md scroll-mt-24">
              <WaitlistForm />
            </div>
            <p className="mb-12 text-xl font-semibold text-gray-800">
              Launching&nbsp;in:
              <span className="ml-3 font-mono text-2xl">
                {`${timeLeft.months}mo ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
              </span>
            </p>
          </section>

          {/* Why Join */}
          <section aria-labelledby="why" className="mb-20 text-left">
            <h2 id="why" className="mb-6 text-center text-3xl font-bold">
              Why You Should Join the Waitlist
            </h2>
            <p className="mb-6 text-lg text-gray-700">
              VeriLex AI isn’t just another legal‑tech product — it’s a movement toward smarter, leaner, more effective lawyering.
            </p>
            <p className="mb-4 text-lg text-gray-700">
              By joining, you gain early access to technology designed to eliminate busywork and elevate your legal practice. You’ll:
            </p>
            <ul className="mx-auto max-w-3xl list-inside list-disc space-y-3 text-lg text-gray-700">
              <li>Slash hours off research and document review</li>
              <li>Impress clients with faster, clearer deliverables</li>
              <li>Stay ahead of competitors with next‑gen AI tools</li>
              <li>Help shape features based on real attorney workflows</li>
              <li>Receive priority onboarding, support, and discounts</li>
            </ul>
          </section>

          {/* Brand Story */}
          <section aria-labelledby="story" className="mb-20 text-left">
            <h2 id="story" className="mb-6 text-center text-3xl font-bold">
              The VeriLex AI Story
            </h2>
            <p className="text-lg text-gray-700">
              VeriLex AI was born out of frustration — watching brilliant attorneys waste time on tasks that could (and should) be automated.
            </p>
            <p className="mt-4 text-lg text-gray-700">
              Our founding team blends legal expertise, software engineering, and AI innovation. We’re building the legal assistant you’ve always needed — one that never sleeps, never forgets, and always delivers value.
            </p>
          </section>

          {/* Features */}
          <section aria-labelledby="features" className="mb-20 text-left">
            <h2 id="features" className="mb-6 text-center text-3xl font-bold">
              Key Features
            </h2>
            <ul className="mx-auto max-w-2xl space-y-4 text-lg">
              <li>
                <strong>🧠 Legal Research:</strong> Get accurate, AI‑assisted legal research in seconds.
              </li>
              <li>
                <strong>📝 Case Summarization:</strong> Upload documents and receive clear, concise summaries instantly.
              </li>
              <li>
                <strong>📄 Contract Review:</strong> Highlight risk clauses, extract key terms, and auto‑generate summaries.
              </li>
              <li>
                <strong>🤖 Smart Assistant:</strong> Ask questions about legal topics and get guided answers.
              </li>
            </ul>
          </section>

          {/* Roadmap */}
          <section aria-labelledby="roadmap" className="mb-20 text-left">
            <h2 id="roadmap" className="mb-6 text-center text-3xl font-bold">
              Roadmap
            </h2>
            <ul className="mx-auto max-w-2xl space-y-4 text-lg">
              <li>
                <strong>🔒 April 2025:</strong> Secure waitlist opens for early adopters.
              </li>
              <li>
                <strong>🧪 May 2025:</strong> Beta access begins for legal research & summarization tools.
              </li>
              <li>
                <strong>📑 June 2025:</strong> Launch of contract analyzer and auto‑summary engine.
              </li>
              <li>
                <strong>⚖️ July 2025:</strong> Guided AI legal assistant for client Q&A scenarios.
              </li>
              <li>
                <strong>🌐 August 2025:</strong> Expansion to immigration, family, and business law domains.
              </li>
              <li>
                <strong>🚀 October 1, 2025:</strong> Full public launch with integrated billing & support.
              </li>
            </ul>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq" className="mb-20 text-left">
            <h2 id="faq" className="mb-6 text-center text-3xl font-bold">
              FAQ
            </h2>
            <div className="mx-auto max-w-2xl space-y-6">
              <details className="rounded border border-gray-200 p-4 open:shadow-sm">
                <summary className="cursor-pointer font-semibold">Is VeriLex AI a law firm?</summary>
                <p className="pt-2 text-gray-700">
                  No. VeriLex AI is a legal‑automation platform and does not offer legal advice. Always consult a licensed attorney for legal matters.
                </p>
              </details>
              <details className="rounded border border-gray-200 p-4 open:shadow-sm">
                <summary className="cursor-pointer font-semibold">Who is this platform for?</summary>
                <p className="pt-2 text-gray-700">
                  Solo practitioners, small firms, and legal professionals looking to save time and improve efficiency with smart tools.
                </p>
              </details>
              <details className="rounded border border-gray-200 p-4 open:shadow-sm">
                <summary className="cursor-pointer font-semibold">When does access start?</summary>
                <p className="pt-2 text-gray-700">
                  Beta testing begins in May 2025. Sign up now to secure early access before public launch.
                </p>
              </details>
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="contact" className="mb-20 text-left">
            <h2 id="contact" className="mb-6 text-center text-3xl font-bold">
              Contact
            </h2>
            <p className="text-lg text-gray-700">
              Questions, feedback, or partnership ideas? Reach out at:
              <br />
              <a href="mailto:founder@verilex.us" className="text-blue-600 underline">
                founder@verilex.us
              </a>
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-10 text-center text-sm text-gray-400">
          VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
        </footer>

        <Analytics />
      </div>
    </>
  );
}
