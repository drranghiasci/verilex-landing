'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

import WaitlistForm   from '@/components/WaitlistForm';
import CookieBanner   from '@/components/CookieBanner';
import { Analytics }  from '@vercel/analytics/react';

/* ────────────────────────────────────────── dynamic 3-D background */
const WaveBackground = dynamic(
  () => import('@/components/WaveBackground'),   // new dotted-wave component
  { ssr: false }
);

/* ────────────────────────────────────────── Countdown hook */
const calcCountdown = (target: Date) => {
  const d = target.getTime() - Date.now();
  return {
    months:  Math.max(0, Math.floor(d / (1000 * 60 * 60 * 24 * 30))),
    days:    Math.max(0, Math.floor((d % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24))),
    hours:   Math.max(0, Math.floor((d % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))),
    minutes: Math.max(0, Math.floor((d % (1000 * 60 * 60)) / (1000 * 60))),
    seconds: Math.max(0, Math.floor((d % (1000 * 60)) / 1000)),
  } as const;
};

function useCountdown(target: Date) {
  const [time, setTime] = useState(() => calcCountdown(target));
  useEffect(() => {
    const id = setInterval(() => setTime(calcCountdown(target)), 1_000);
    return () => clearInterval(id);
  }, [target]);
  return time;
}

/* ────────────────────────────────────────── Static roadmap */
const ROADMAP = [
  { date: 'Apr 2025', title: 'Waitlist Opens',          desc: 'Gather early-adopter attorneys & gauge feature priorities.',         icon: '🔒' },
  { date: 'Aug 2025', title: 'Private Alpha',           desc: 'Research & summary engine available to internal testers.',            icon: '🧪' },
  { date: '1 Oct 2025', title: 'Closed Beta',           desc: 'Invite-only beta for 50 firms. Feedback loops & bug fixes.',          icon: '🚧' },
  { date: 'Nov 2025', title: 'Contract Analyzer Alpha', desc: 'Risk-clause detection and key-term extraction.',                     icon: '📑' },
  { date: 'Dec 2025', title: 'Smart Assistant Preview', desc: 'Natural-language Q&A on statutes, rulings, and firm docs.',          icon: '🤖' },
  { date: '1 Jan 2026', title: 'Public Launch',         desc: 'Self-serve onboarding, billing, and live support.',                  icon: '🚀' },
  { date: 'Q1 2026',  title: 'Practice-Area Expansion', desc: 'Immigration, family, and business-law playbooks.',                   icon: '🌐' },
] as const;

/* ────────────────────────────────────────── Stat messages and rotator */
const STAT_MESSAGES = [
  'Save up to 12 hours per week by automating case law and statute research.',
  'Handle 30% more clients using streamlined AI-powered intake.',
  'Draft documents 40% faster with AI-generated summaries and templates.',
  'Cut response times by 60% with automated client messaging tools.',
  'Reduce overhead costs by 20–25% by automating repetitive legal admin.',
  'Boost client satisfaction with faster turnaround and clearer communication.',
];

function StatRotator({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 7000); // changed from 10000ms to 7000ms
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
      className="px-4"
    >
      {messages[index]}
    </motion.div>
  );
}

/* ────────────────────────────────────────── Page */
export default function Home() {
  const launchDate = new Date('2026-01-01T05:00:00Z');  // 00:00 EST
  const countdown  = useCountdown(launchDate);

  return (
    <>
      {/* SEO / OG */}
      <Head>
        <title>VeriLex AI | AI-Powered Legal Software for Solo & Small Firms</title>
        <meta name="description" content="Legal AI software that automates research, contract review, and client intake." />
        <meta name="keywords"    content="Legal AI, Legal research automation, Contract analyzer" />
        <link rel="canonical" href="https://verilex.ai/" />
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="VeriLex AI | AI-Powered Legal Assistant" />
        <meta property="og:description" content="Automate legal research, summarize cases, and review contracts." />
        <meta property="og:url"         content="https://verilex.ai/" />
        <meta property="og:image"       content="https://verilex.ai/og-cover.png" />
        <meta name="twitter:card"       content="summary_large_image" />
      </Head>

      {/* ────────────────────────── Shell */}
      <div className="relative min-h-screen scroll-smooth bg-gradient-to-br from-background to-background/80 text-foreground">
        <WaveBackground />

        {/* ───────── Header */}
        <header className="fixed inset-x-0 top-0 z-50 bg-background/90 backdrop-blur border-b border-border">
          <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6" aria-label="Main Navigation">
            {/* Logo pair */}
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-indigo-600">
              <Image
                src="/verilex-logo-name.png"
                alt="VeriLex AI"
                width={150}
                height={46}
                priority
                unoptimized
                className="object-contain transition-opacity dark:opacity-0"
              />
              <Image
                src="/verilex-logo-name-darkmode.png"
                alt="VeriLex AI (dark)"
                width={150}
                height={46}
                priority
                unoptimized
                className="absolute inset-0 object-contain opacity-0 transition-opacity dark:opacity-100"
              />
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/login"   className="hover:text-foreground transition">Log In</Link>
              <Link href="#contact" className="hover:text-foreground transition">Contact</Link>
              <Link
                href="/register"
                className="rounded border border-foreground px-4 py-1.5 hover:bg-foreground hover:text-background transition"
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </header>

        {/* ───────── Main */}
        <main className="mx-auto max-w-4xl px-4 pt-32 text-center">

          {/* Hero */}
          <section
            id="hero"
            className="relative flex flex-col items-center py-28 overflow-hidden"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              Your AI-Powered Legal Assistant
            </h1>
            <p className="mt-6 text-lg md:text-xl text-foreground/70">
              Automate research, summarize cases, manage intake, and review contracts — all in one secure platform.
            </p>

            {/* Security */}
            <div className="mt-4 flex items-center justify-center text-sm text-foreground/60">
              <ShieldCheck className="mr-2 h-4 w-4" aria-hidden="true" />
              256-bit encryption • SOC 2 Type II (in progress)
            </div>

            {/* Countdown */}
            <p className="mt-8 inline-block rounded bg-foreground px-5 py-2 text-lg font-semibold text-background">
              Public launch&nbsp;in&nbsp;
              <span className="font-mono">
                {`${countdown.months}mo ${countdown.days}d ${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`}
              </span>
            </p>
          </section>

          {/* Waitlist */}
          <section id="waitlist" className="py-16">
            <h2 className="mb-6 text-3xl font-bold">Join the Waitlist</h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-foreground/70">
              Early adopters receive priority onboarding, exclusive discounts, and direct access to the founding team.
            </p>
            <div className="mx-auto w-full max-w-md">
              <WaitlistForm />
            </div>
          </section>

          {/* Roadmap */}
          <section className="py-16 text-left">
            <h2 className="mb-6 text-center text-3xl font-bold">Product Roadmap</h2>
            <ul className="relative mx-auto max-w-2xl border-l border-border pl-6">
              {ROADMAP.map(({ date, title, desc, icon }) => (
                <li key={title} className="group mb-10 last:mb-0 first:mt-0">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-background ring-2 ring-indigo-600">
                    {icon}
                  </span>
                  <details className="cursor-pointer">
                    <summary className="font-semibold">
                      {title}{' '}
                      <span className="ml-2 text-sm font-normal text-foreground/60">{date}</span>
                    </summary>
                    <p className="mt-2 text-foreground/70">{desc}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {/* Impact Stats Section */}
          <section className="py-24 text-center">
            <h2 className="mb-10 text-4xl font-bold">How VeriLex AI Helps Law Firms</h2>
            <div className="flex justify-center items-center min-h-[3rem]">
              <div className="mt-4 text-2xl md:text-3xl font-medium text-foreground transition-all duration-2000">
                <StatRotator messages={STAT_MESSAGES} />
              </div>
            </div>
          </section>

          {/* OUR STORY SECTION */}
          <section id="story" className="py-24 text-left">
            <h2 className="mb-8 text-center text-4xl font-bold">Our Story</h2>
            <div className="mx-auto max-w-3xl space-y-8 text-foreground/70 text-lg leading-relaxed">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-center italic text-foreground/60"
              >
                We’re not lawyers. We’re entrepreneurs. And we’re building the future of legal work.
              </motion.p>
              {[
                `VeriLex AI began with a simple realization: lawyers are doing far too much work that AI can handle. As a small team of builders and creatives, we saw an opportunity to help legal professionals spend more time doing what matters — serving clients, winning cases, and making a difference.`,
                `We’re not here to replace attorneys — we’re here to amplify them. From client intake to document automation and beyond, VeriLex AI is built to be an all-in-one assistant that reduces burnout, improves accuracy, and reclaims time.`,
                `As a young founder, I’m not from the legal world — and that’s why I’m asking better questions. Why can’t legal tools feel intuitive? Why can’t solo attorneys and small firms have access to the same superpowers as big law? Why isn’t there a platform built just for them?`,
                `We’re building VeriLex AI to change that. With input from real attorneys and a commitment to security and usability, we’re creating the tools that will define the next generation of legal work — smarter, faster, more human.`,
              ].map((text, idx) => (
                <motion.p
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.15 }}
                  viewport={{ once: true }}
                >
                  {text}
                </motion.p>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
                className="mt-10 border-l-4 border-indigo-500 pl-6 italic text-foreground/60"
              >
                “This is just the beginning. We’re proud to be building VeriLex AI — and we can’t wait to see how it empowers the attorneys who inspire us.”
                <br />
                <span className="mt-4 block text-right font-bold">
                  – The VeriLex AI Team
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                viewport={{ once: true }}
                className="mt-12 text-center"
              >
                <Link
                  href="#waitlist"
                  className="
                    inline-block rounded
                    bg-indigo-600 px-6 py-3 text-white
                    font-semibold shadow-md
                    hover:bg-indigo-700
                    transition
                  "
                >
                  Join the Early Access Waitlist
                </Link>
              </motion.div>
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq" className="py-16 text-left">
            <h2 id="faq" className="mb-6 text-center text-3xl font-bold">
              FAQ
            </h2>

            <div className="mx-auto max-w-2xl space-y-6">
              {[
                {
                  q: 'Is VeriLex AI a law firm?',
                  a: 'No. VeriLex AI is a legal-automation platform and does not provide legal advice. Always consult a licensed attorney for legal matters.',
                },
                {
                  q: 'When does beta access start?',
                  a: 'Closed beta begins 1 October 2025 for the first 50 firms on the waitlist.',
                },
                {
                  q: 'How secure is my data?',
                  a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are pursuing SOC 2 Type II certification.',
                },
                {
                  q: 'Do I need to install anything?',
                  a: 'No installations needed. VeriLex AI runs entirely in the cloud and is accessible from any modern browser.',
                },
                {
                  q: 'What practice areas are supported?',
                  a: 'We’re starting with divorce/family law, but will soon support immigration, estate, and business law.',
                },
                {
                  q: 'Is there a mobile app?',
                  a: 'A mobile web version is available. A native app is in development and planned for early 2026.',
                },
                {
                  q: 'How much will it cost?',
                  a: 'We’re finalizing tiered pricing based on firm size. Early users will receive exclusive lifetime discounts.',
                },
                {
                  q: 'Can I request features?',
                  a: 'Absolutely. We prioritize feedback from beta users and solo firms when planning new features.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="rounded border border-border p-4 open:shadow-sm">
                  <summary className="cursor-pointer font-semibold">{q}</summary>
                  <p className="pt-2 text-foreground/70">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section id="contact" aria-labelledby="contact-heading" className="py-16 text-left">
            <h2 id="contact-heading" className="mb-6 text-center text-3xl font-bold">
              Contact
            </h2>
            <p className="text-lg text-foreground/70 text-center">
              Questions or partnership ideas? Reach us at&nbsp;
              <a href="mailto:founder@verilex.us" className="text-accent underline">
                founder@verilex.us
              </a>
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="py-10 text-center text-sm text-foreground/50">
          VeriLex AI is <span className="whitespace-nowrap">not a law firm</span> and does not provide legal advice.
          <br />
          <Link
            href="/privacy"
            className="underline decoration-1 underline-offset-2 hover:text-accent focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Privacy Policy
          </Link>
        </footer>

        {/* Cookie banner & analytics */}
        <CookieBanner />
        <Analytics />
      </div>
    </>
  );
}
