'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

import WaitlistForm  from '@/components/WaitlistForm';
import CookieBanner   from '@/components/CookieBanner';
import { Analytics }  from '@vercel/analytics/react';

/* ------------------------------------------------------------------------- */
/* Hook: useCountdown                                                        */
/* ------------------------------------------------------------------------- */
function useCountdown(target: Date) {
  const calc = () => {
    const d = target.getTime() - Date.now();
    return {
      months:  Math.max(0, Math.floor(d / (1000 * 60 * 60 * 24 * 30))),
      days:    Math.max(0, Math.floor((d % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24))),
      hours:   Math.max(0, Math.floor((d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
      minutes: Math.max(0, Math.floor((d % (1000 * 60 * 60)) / (1000 * 60))),
      seconds: Math.max(0, Math.floor((d % (1000 * 60)) / 1000)),
    } as const;
  };

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

/* ------------------------------------------------------------------------- */
/* Static Roadmap Data                                                       */
/* ------------------------------------------------------------------------- */
const ROADMAP = [
  { date: 'Apr 2025',   title: 'Waitlist Opens',          desc: 'Gather early‑adopter attorneys & gauge feature priorities.',         icon: '🔒' },
  { date: 'Aug 2025',   title: 'Private Alpha',           desc: 'Research & summary engine available to internal testers.',            icon: '🧪' },
  { date: '1 Oct 2025', title: 'Closed Beta',             desc: 'Invite‑only beta for 50 firms. Feedback loops & bug fixes.',          icon: '🚧' },
  { date: 'Nov 2025',   title: 'Contract Analyzer Alpha', desc: 'Risk‑clause detection and key‑term extraction.',                     icon: '📑' },
  { date: 'Dec 2025',   title: 'Smart Assistant Preview', desc: 'Natural‑language Q&A on statutes, rulings, and firm docs.',          icon: '🤖' },
  { date: '1 Jan 2026', title: 'Public Launch',           desc: 'Self‑serve onboarding, billing, and live support.',                  icon: '🚀' },
  { date: 'Q1 2026',    title: 'Practice‑Area Expansion', desc: 'Immigration, family, and business‑law playbooks.',                   icon: '🌐' },
] as const;

/* ------------------------------------------------------------------------- */
/* Page Component                                                            */
/* ------------------------------------------------------------------------- */
export default function Home() {
  const launchDate = new Date('2026-01-01T05:00:00Z'); // 00:00 EST
  const countdown  = useCountdown(launchDate);

  return (
    <>
      {/* SEO / Social */}
      <Head>
        <title>VeriLex AI | AI‑Powered Legal Software for Solo & Small Firms</title>
        <meta
          name="description"
          content="Legal AI software that automates research, contract review, and client intake so attorneys can focus on clients. Join the waitlist today."
        />
        <meta
          name="keywords"
          content="Legal AI Software, Legal AI, Legal task manager, AI Client intake, Law firm automation, VeriLex AI"
        />
        <link rel="canonical" href="https://verilex.ai/" />
        <meta property="og:type"  content="website" />
        <meta property="og:title" content="VeriLex AI | AI‑Powered Legal Assistant" />
        <meta
          property="og:description"
          content="Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms."
        />
        <meta property="og:url"   content="https://verilex.ai/" />
        <meta property="og:image" content="https://verilex.ai/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Shell */}
      <div className="scroll-smooth bg-gradient-to-br from-white to-slate-100 text-gray-900 min-h-screen">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <header className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
          <nav
            className="flex w-full items-center justify-between px-4 sm:px-6 py-3"
            aria-label="Main Navigation"
          >
            <Link
              href="/"
              className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
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
                href="/login"
                className="hover:text-black transition focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Log In
              </Link>

              <Link
                href="#contact"
                className="hover:text-black transition focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Contact
              </Link>

              <Link
                href="/register"   /*  <-- routes to app/register/page.tsx  */
                className="rounded border border-gray-900 px-4 py-1.5 hover:bg-gray-900 hover:text-white transition focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </header>

        {/* ----------------------------------------------------------------- */}
        {/* Main                                                              */}
        {/* ----------------------------------------------------------------- */}
        <main className="mx-auto max-w-4xl px-4 pt-28 text-center">
          {/* Hero */}
          <section id="hero" aria-label="Hero" className="flex flex-col items-center py-28">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Your AI‑Powered Legal Assistant
            </h1>
            <p className="mt-6 text-lg md:text-xl text-gray-700">
              Automate research, summarize cases, manage intake, and review contracts — all in one secure platform.
            </p>

            {/* Security */}
            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              256‑bit encryption • SOC 2 Type II (in progress)
            </div>

            {/* Countdown */}
            <p className="mt-8 inline-block rounded bg-gray-900 px-5 py-2 text-lg font-semibold text-white">
              Public launch&nbsp;in&nbsp;
              <span className="font-mono">
                {`${countdown.months}mo ${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
              </span>
            </p>
          </section>

          {/* Waitlist */}
          <section id="waitlist" aria-labelledby="join" className="py-16">
            <h2 id="join" className="mb-6 text-3xl font-bold">
              Join the Waitlist
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-700">
              Early adopters receive priority onboarding, exclusive discounts, and direct access to the founding team.
            </p>
            <div className="mx-auto w-full max-w-md">
              <WaitlistForm />
            </div>
          </section>

          {/* Roadmap */}
          <section aria-labelledby="roadmap" className="py-16 text-left">
            <h2 id="roadmap" className="mb-6 text-center text-3xl font-bold">
              Product Roadmap
            </h2>

            <ul className="relative mx-auto max-w-2xl border-l border-gray-300 pl-6">
              {ROADMAP.map(({ date, title, desc, icon }) => (
                <li key={title} className="group mb-10 last:mb-0 -mt-2 first:mt-0">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-indigo-600 text-base">
                    {icon}
                  </span>
                  <details className="cursor-pointer">
                    <summary className="font-semibold text-gray-900">
                      {title}{' '}
                      <span className="ml-2 text-sm font-normal text-gray-500">{date}</span>
                    </summary>
                    <p className="mt-2 text-gray-700">{desc}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq" className="py-16 text-left">
            <h2 id="faq" className="mb-6 text-center text-3xl font-bold">
              FAQ
            </h2>

            <div className="mx-auto max-w-2xl space-y-6">
              {[
                {
                  q: 'Is VeriLex AI a law firm?',
                  a: 'No. VeriLex AI is a legal‑automation platform and does not provide legal advice. Always consult a licensed attorney for legal matters.',
                },
                {
                  q: 'When does beta access start?',
                  a: 'Closed beta begins 1 October 2025 for the first 50 firms on the waitlist.',
                },
                {
                  q: 'How secure is my data?',
                  a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES‑256). We are pursuing SOC 2 Type II certification.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="rounded border border-gray-200 p-4 open:shadow-sm">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="pt-2 text-gray-700">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section aria-labelledby="contact" className="py-16 text-left">
            <h2 id="contact" className="mb-6 text-center text-3xl font-bold">
              Contact
            </h2>
            <p className="text-lg text-gray-700">
              Questions or partnership ideas? Reach us at&nbsp;
              <a href="mailto:founder@verilex.us" className="text-blue-600 underline">
                founder@verilex.us
              </a>
            </p>
          </section>
        </main>

        {/* ----------------------------------------------------------------- */}
        {/* Footer                                                            */}
        {/* ----------------------------------------------------------------- */}
        <footer className="py-10 text-center text-sm text-gray-400">
          VeriLex AI is <span className="whitespace-nowrap">not a law firm</span> and does not
          provide legal advice. All information is for informational purposes only.
          <br />
          <Link
            href="/privacy"
            className="underline decoration-1 underline-offset-2 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Privacy Policy
          </Link>
        </footer>

        {/* Cookie banner & analytics */}
        <CookieBanner />
        <Analytics />
      </div>
    </>
  );
}
