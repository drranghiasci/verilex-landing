'use client';

import Head from 'next/head';
import Link from 'next/link';
import { ShieldCheck, ChevronRight, Clock, Users, Zap, Shield, CheckCircle } from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';
import ThemeToggle from '@/components/ThemeToggle';
import VerilexLogo from '@/components/VerilexLogo';

/* Gradient headline with safe fallback + size/center props */
function GradientHeadline({
  children,
  size = 'lg',
  center = true,
}: {
  children: React.ReactNode;
  size?: 'xl' | 'lg' | 'md';
  center?: boolean;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Solid accent fallback on first paint / unsupported browsers
    el.style.color = 'var(--accent)';
    const supportsClip =
      (window.CSS && CSS.supports('background-clip: text')) ||
      (window.CSS && CSS.supports('-webkit-background-clip: text'));

    if (supportsClip) {
      el.style.backgroundImage = 'linear-gradient(90deg, var(--accent-soft), var(--accent))';
      // @ts-ignore vendor
      (el.style as any).webkitBackgroundClip = 'text';
      el.style.backgroundClip = 'text';
      // @ts-ignore vendor
      (el.style as any).webkitTextFillColor = 'transparent';
      el.style.color = 'transparent';
    }
  }, []);

  const sizes: Record<string, string> = {
    xl: 'text-5xl md:text-7xl font-extrabold',
    lg: 'text-3xl md:text-4xl font-bold',
    md: 'text-2xl md:text-3xl font-semibold',
  };

  const align = center ? 'text-center' : 'text-left';

  return (
    <h2 ref={ref} className={`${sizes[size]} tracking-tight leading-[1.15] ${align}`}>
      {children}
    </h2>
  );
}

/* content data */
const STAT_MESSAGES = [
  { stat: '12 hours', description: 'saved per week by automating case law and statute research', icon: <Clock className="h-8 w-8 text-[color:var(--accent)]" /> },
  { stat: '30% more', description: 'clients handled using streamlined AI-powered intake', icon: <Users className="h-8 w-8 text-green-500" /> },
  { stat: '40% faster', description: 'document drafting with AI-generated summaries and templates', icon: <Zap className="h-8 w-8 text-yellow-500" /> },
  { stat: '60% reduction', description: 'in response times with automated client messaging tools', icon: <CheckCircle className="h-8 w-8 text-blue-500" /> },
  { stat: '25% savings', description: 'in overhead costs by automating repetitive legal admin', icon: <Shield className="h-8 w-8 text-[color:var(--accent)]" /> },
];

function StatRotator({ messages }: { messages: typeof STAT_MESSAGES }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const rotateToNext = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((p) => (p + 1) % messages.length);
      setIsAnimating(false);
    }, 150);
  }, [messages.length]);

  useEffect(() => {
    const i = setInterval(rotateToNext, 4000);
    return () => clearInterval(i);
  }, [rotateToNext]);

  const current = messages[currentIndex];

  return (
    <div className="relative h-48 md:h-56 flex items-center justify-center overflow-hidden">
      <div className={`flex flex-col items-center text-center space-y-3 transition-all duration-300 ${isAnimating ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
        <div className="mb-3">{current.icon}</div>
        <div className="text-3xl md:text-4xl font-bold text-[color:var(--accent)]">{current.stat}</div>
        <div className="text-lg md:text-xl text-[color:var(--text-1)] max-w-lg">{current.description}</div>
      </div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex space-x-2">
        {messages.map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-[color:var(--accent)]' : 'bg-[color:var(--accent-soft)]/60'} ${i !== currentIndex ? 'dot' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      {/* SEO / OG */}
      <Head>
        <title>VeriLex AI | AI-Powered Legal Software for Solo & Small Firms</title>
        <meta name="description" content="Legal AI software that automates research, contract review, and client intake." />
        <meta name="keywords" content="Legal AI, Legal research automation, Contract analyzer" />
        <link rel="canonical" href="https://verilex.ai/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="VeriLex AI | AI-Powered Legal Assistant" />
        <meta property="og:description" content="Automate legal research, summarize cases, and review contracts." />
        <meta property="og:url" content="https://verilex.ai/" />
        <meta property="og:image" content="https://verilex.ai/og-cover.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      {/* Shell */}
      <div className="relative min-h-screen scroll-smooth">
        {/* <WaveBackground /> */}

        {/* Header */}
        <header className="fixed inset-x-0 top-0 z-50 bg-[var(--surface-0)] backdrop-blur-sm border-b border-white/10">
          <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto" aria-label="Main Navigation">
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded-lg">
              <VerilexLogo className="w-[150px] h-auto object-contain" />
            </Link>

            <div className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
              <ThemeToggle />
              <Link href="/capabilities" className="hover:text-[color:var(--accent-soft)] transition-colors">Capabilities</Link>
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

        {/* Main */}
        <main className="mx-auto max-w-6xl px-4 pt-32">

          {/* Hero */}
          <section id="hero" className="relative w-full min-h-screen overflow-hidden border-b border-white/10">
            <div className="pt-24 pb-24 px-4 h-full flex items-center">
              <div className="mx-auto max-w-6xl text-center w-full">
                <GradientHeadline size="xl">Your AI-Powered Legal Assistant</GradientHeadline>

                <p className="mt-6 text-lg md:text-xl text-[color:var(--text-1)] max-w-2xl mx-auto">
                  Automate research, summarize cases, manage intake, and review contracts — all in one secure platform built for solo and small law firms.
                </p>

                <div className="mt-6 flex items-center justify-center text-sm text-[color:var(--text-2)]">
                  <ShieldCheck className="mr-2 h-4 w-4 text-green-400" aria-hidden="true" />
                  <span>256-bit encryption • SOC 2 Type II (in progress) • Attorney-client privilege protected</span>
                </div>

                <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
                  <Link
                    href="/firm-intake"
                    className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-white font-semibold shadow-lg hover:bg-[color:var(--accent)] transition-all hover:scale-[1.02]"
                  >
                    Firm Intake
                    <ChevronRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="https://myclient.verilex.us/"
                    className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-white font-semibold shadow-lg hover:bg-[color:var(--accent)] transition-all hover:scale-[1.02]"
                  >
                    Open MyClient Portal
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Impact Stats */}
          <section className="py-20">
            <div className="text-center">
              <GradientHeadline size="lg">Transform Your Practice</GradientHeadline>
              <p className="text-lg text-[color:var(--text-1)] mb-12 max-w-2xl mx-auto mt-4">
                See how VeriLex AI empowers solo attorneys and small firms to work smarter, not harder.
              </p>
              <StatRotator messages={STAT_MESSAGES} />
            </div>
          </section>

          {/* Our Story */}
          <section id="story" className="py-20">
            <div className="max-w-4xl mx-auto">
              <GradientHeadline size="lg">Why We Built VeriLex AI</GradientHeadline>

              <div className="grid md:grid-cols-2 gap-12 items-center mt-12">
                <div className="space-y-6">
                  <div className="bg-[var(--surface-1)] p-6 rounded-lg border-l-4 border-[color:var(--accent-light)]">
                    <p className="text-lg font-medium text-[color:var(--accent-soft)] mb-2">The Problem We Discovered</p>
                    <p className="text-[color:var(--text-1)]">
                      While working with small law firms, we noticed talented attorneys spending 60–70% of their time on repetitive tasks—research, document review, client intake—instead of practicing law.
                    </p>
                  </div>

                  <div className="bg-[var(--surface-1)] p-6 rounded-lg border-l-4 border-green-400">
                    <p className="text-lg font-medium text-emerald-700 dark:text-green-200 mb-2">Our Mission</p>
                    <p className="text-[color:var(--text-1)]">
                      We believe solo attorneys and small firms deserve the same technological advantages as large firms. VeriLex AI levels the playing field by automating routine work so lawyers can focus on what matters most—their clients.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-[var(--surface-1)] p-6 rounded-lg border-l-4 border-[color:var(--accent-light)]">
                    <p className="text-lg font-medium text-[color:var(--accent-soft)] mb-2">Built By Legal Tech Experts</p>
                    <p className="text-[color:var(--text-1)]">
                      Our team combines deep AI expertise with real-world legal experience. We&apos;ve spent months interviewing attorneys, understanding their workflows, and building solutions that actually work.
                    </p>
                  </div>

                  <div className="bg-[var(--surface-1)] p-6 rounded-lg border-l-4 border-amber-400">
                    <p className="text-lg font-medium text-amber-700 dark:text-amber-200 mb-2">Security & Trust First</p>
                    <p className="text-[color:var(--text-1)]">
                      Every feature is built with attorney-client privilege in mind. We use bank-level encryption, undergo regular security audits, and never train our AI on client data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="py-20">
            <GradientHeadline size="lg">Frequently Asked Questions</GradientHeadline>
            <div className="max-w-3xl mx-auto space-y-4 mt-12">
              {[
                { q: 'Is VeriLex AI a law firm?', a: 'No. VeriLex AI is a legal-automation platform and does not provide legal advice. Always consult a licensed attorney for legal matters.' },
                { q: 'When can I start using VeriLex AI?', a: 'Private alpha begins August 2025 with a phased rollout to partner firms, followed by a broader beta in October 2025.' },
                { q: 'How secure is my data?', a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are pursuing SOC 2 Type II certification and never train our AI on client data.' },
                { q: 'Do I need to install anything?', a: 'VeriLex AI runs in the cloud and is accessible from any modern browser — nothing to install.' },
                { q: 'What practice areas are supported?', a: "We're starting with divorce/family law, and expanding to immigration, estate planning, and business law by Q1 2026." },
                { q: 'How much will it cost?', a: 'Tiered pricing by firm size with discounts for annual commitments and bundled product access.' },
                { q: 'Can I request features?', a: 'Absolutely. We prioritize feedback from beta users and solo firms when planning new features.' },
                { q: 'What makes VeriLex AI different?', a: 'It’s built specifically for legal workflows with privilege protection and legal-tuned models.' },
              ].map(({ q, a }) => (
                <details key={q} className="group border border-white/10 rounded-lg bg-[var(--surface-0)]">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-[var(--surface-1)] transition-colors">
                    <span className="font-semibold text-left">{q}</span>
                    <ChevronRight className="h-5 w-5 text-[color:var(--text-2)] group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-[color:var(--text-1)] leading-relaxed">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Feedback */}
          <section id="feedback" className="py-20 text-center">
            <GradientHeadline size="lg">Feedback</GradientHeadline>
            <div className="max-w-2xl mx-auto mt-8">
              <p className="text-lg text-[color:var(--text-1)] mb-8">
                We&apos;re building VeriLex AI with early firm input. Share feedback below.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/feedback"
                  className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-white font-semibold hover:bg-[color:var(--accent)] transition-colors"
                >
                  Leave Feedback
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://myclient.verilex.us/myclient/app"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--accent-light)] px-6 py-3 text-[color:var(--accent-soft)] hover:bg-[color:var(--surface-1)] transition-colors"
                >
                  MyClient Portal
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-[color:var(--text-2)] mb-4">
              VeriLex AI is <strong>not a law firm</strong> and does not provide legal advice.
              <br />
              Always consult with a licensed attorney for legal matters.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <Link href="/privacy" className="text-[color:var(--text-2)] hover:text-[color:var(--accent-soft)] transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-[color:var(--text-2)] hover:text-[color:var(--accent-soft)] transition-colors">Terms of Service</Link>
              <span className="text-[color:var(--text-2)]">© {new Date().getFullYear()} VeriLex AI</span>
            </div>
          </div>
        </footer>

        <CookieBanner />
        <Analytics />
      </div>
    </>
  );
}
