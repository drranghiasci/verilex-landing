'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ChevronRight, Clock, Users, Zap, Shield, CheckCircle } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
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

/* ────────────────────────────────────────── Optimized Countdown hook */
const calcCountdown = (target: Date) => {
  const now = Date.now();
  const diff = target.getTime() - now;
  
  if (diff <= 0) {
    return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
  const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { months, days, hours, minutes, seconds };
};

function useCountdown(target: Date) {
  const [time, setTime] = useState(() => calcCountdown(target));
  
  useEffect(() => {
    const updateTime = () => setTime(calcCountdown(target));
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [target]);
  
  return time;
}

/* ────────────────────────────────────────── Optimized roadmap */
const ROADMAP = [
  { 
    date: 'Apr 2025', 
    title: 'Waitlist Opens', 
    desc: 'Gather early-adopter attorneys & gauge feature priorities.', 
    icon: '🔒',
    status: 'completed'
  },
  { 
    date: 'Aug 2025', 
    title: 'Private Alpha', 
    desc: 'Research & summary engine available to internal testers.', 
    icon: '🧪',
    status: 'current'
  },
  { 
    date: 'Oct 2025', 
    title: 'Closed Beta', 
    desc: 'Invite-only beta for 50 firms. Feedback loops & bug fixes.', 
    icon: '🚧',
    status: 'upcoming'
  },
  { 
    date: 'Nov 2025', 
    title: 'Contract Analyzer Alpha', 
    desc: 'Risk-clause detection and key-term extraction.', 
    icon: '📑',
    status: 'upcoming'
  },
  { 
    date: 'Dec 2025', 
    title: 'Smart Assistant Preview', 
    desc: 'Natural-language Q&A on statutes, rulings, and firm docs.', 
    icon: '🤖',
    status: 'upcoming'
  },
  { 
    date: 'Jan 2026', 
    title: 'Public Launch', 
    desc: 'Self-serve onboarding, billing, and live support.', 
    icon: '🚀',
    status: 'upcoming'
  },
  { 
    date: 'Q1 2026', 
    title: 'Practice-Area Expansion', 
    desc: 'Immigration, family, and business-law playbooks.', 
    icon: '🌐',
    status: 'upcoming'
  },
];

/* ────────────────────────────────────────── Enhanced stat messages with swipe animation */
const STAT_MESSAGES = [
  { 
    stat: '12 hours', 
    description: 'saved per week by automating case law and statute research',
    icon: <Clock className="h-8 w-8 text-indigo-500" />
  },
  { 
    stat: '30% more', 
    description: 'clients handled using streamlined AI-powered intake',
    icon: <Users className="h-8 w-8 text-green-500" />
  },
  { 
    stat: '40% faster', 
    description: 'document drafting with AI-generated summaries and templates',
    icon: <Zap className="h-8 w-8 text-yellow-500" />
  },
  { 
    stat: '60% reduction', 
    description: 'in response times with automated client messaging tools',
    icon: <CheckCircle className="h-8 w-8 text-blue-500" />
  },
  { 
    stat: '25% savings', 
    description: 'in overhead costs by automating repetitive legal admin',
    icon: <Shield className="h-8 w-8 text-purple-500" />
  },
];

function StatRotator({ messages }: { messages: typeof STAT_MESSAGES }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const rotateToNext = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length);
      setIsAnimating(false);
    }, 150);
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(rotateToNext, 4000); // Faster rotation: 4 seconds
    return () => clearInterval(interval);
  }, [rotateToNext]);

  const currentMessage = messages[currentIndex];

  return (
<div className="relative h-48 md:h-56 flex items-center justify-center overflow-hidden">
<div 
  className={`flex flex-col items-center text-center space-y-3 transition-all duration-300 ${
    isAnimating ? 'transform translate-x-full opacity-0' : 'transform translate-x-0 opacity-100'
  }`}
>
        <div className="mb-3">
          {currentMessage.icon}
        </div>
        <div className="text-3xl md:text-4xl font-bold text-indigo-600 mb-2">
          {currentMessage.stat}
        </div>
        <div className="text-lg md:text-xl text-foreground/80 max-w-lg">
          {currentMessage.description}
        </div>
      </div>
      
      {/* Progress indicators */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {messages.map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? 'bg-indigo-600' : 'bg-indigo-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────── Main component */
export default function Home() {
  const launchDate = new Date('2026-01-01T05:00:00Z');
  const countdown = useCountdown(launchDate);

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
      <div className="relative min-h-screen scroll-smooth bg-gradient-to-br from-background to-background/80 text-foreground">
        {/* Uncomment if WaveBackground exists */}
        {/* <WaveBackground /> */}

        {/* Header */}
        <header className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <nav className="flex h-16 w-full items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto" aria-label="Main Navigation">
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">
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

            <div className="flex items-center gap-6 text-sm font-medium">
              <Link href="/login" className="hover:text-indigo-600 transition-colors">
                Log In
              </Link>
              <Link href="#contact" className="hover:text-indigo-600 transition-colors">
                Contact
              </Link>
              <Link
                href="/register"
                className="rounded-lg border border-indigo-600 px-4 py-1.5 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="mx-auto max-w-6xl px-4 pt-32">

{/* ───────────── Hero (full-width coloured band) */}
<section
  id="hero"
  className="relative w-full min-h-screen overflow-hidden bg-gradient-to-r
             from-indigo-600/10 via-purple-600/10 to-pink-600/10
             border-b border-border"
>
  {/* push content down so it doesn't hide behind the 64 px fixed header */}
  <div className="pt-32 pb-24 px-4 h-full flex items-center">
    <div className="mx-auto max-w-6xl text-center w-full">

      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight
                     bg-gradient-to-r from-indigo-500 to-purple-600
                     bg-clip-text text-transparent">
        Your AI-Powered Legal Assistant
      </h1>

      <p className="mt-6 text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto">
        Automate research, summarize cases, manage intake, and review contracts —
        all in one secure platform built for solo and small law firms.
      </p>

      <div className="mt-6 flex items-center justify-center text-sm text-foreground/60">
        <ShieldCheck className="mr-2 h-4 w-4 text-green-500" aria-hidden="true" />
        <span>256-bit encryption • SOC 2 Type II (in progress) • Attorney-client privilege protected</span>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
        <Link
          href="#waitlist"
          className="inline-flex items-center gap-2 rounded-lg
                     bg-indigo-600 px-6 py-3 text-white font-semibold shadow-lg
                     hover:bg-indigo-700 transition-all transform hover:scale-105"
        >
          Join Waitlist
          <ChevronRight className="h-4 w-4" />
        </Link>

        <div className="inline-block rounded-lg bg-foreground/5 px-5 py-3
                        text-sm font-medium border border-foreground/10">
          Public launch in{' '}
          <span className="font-mono font-bold text-indigo-600">
            {countdown.months}mo {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
          </span>
        </div>
      </div>
    </div>
  </div>
</section>

          {/* Impact Stats */}
          <section className="py-20">
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Transform Your Practice
              </h2>
              <p className="text-lg text-foreground/70 mb-12 max-w-2xl mx-auto">
                See how VeriLex AI empowers solo attorneys and small firms to work smarter, not harder.
              </p>
              <StatRotator messages={STAT_MESSAGES} />
            </div>
          </section>

          {/* Our Story - Revised */}
          <section id="story" className="py-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
                Why We Built VeriLex AI
              </h2>
              
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6 text-foreground/80">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-lg border-l-4 border-indigo-500">
                    <p className="text-lg font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                      The Problem We Discovered
                    </p>
                    <p className="text-foreground/70">
                      While working with small law firms, we noticed talented attorneys spending 60-70% of their time on repetitive tasks—research, document review, client intake—instead of practicing law.
                    </p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-l-4 border-green-500">
                    <p className="text-lg font-medium text-green-700 dark:text-green-300 mb-2">
                      Our Mission
                    </p>
                    <p className="text-foreground/70">
                      We believe solo attorneys and small firms deserve the same technological advantages as large firms. VeriLex AI levels the playing field by automating routine work so lawyers can focus on what matters most—their clients.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg border-l-4 border-purple-500">
                    <p className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-2">
                      Built By Legal Tech Experts
                    </p>
                    <p className="text-foreground/70">
                      Our team combines deep AI expertise with real-world legal experience. We&#39;ve spent months interviewing attorneys, understanding their workflows, and building solutions that actually work.
                    </p>
                  </div>
                  
                  <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg border-l-4 border-amber-500">
                    <p className="text-lg font-medium text-amber-700 dark:text-amber-300 mb-2">
                      Security & Trust First
                    </p>
                    <p className="text-foreground/70">
                      Every feature is built with attorney-client privilege in mind. We use bank-level encryption, undergo regular security audits, and never train our AI on client data.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-12 text-center">
                <blockquote className="text-xl md:text-2xl font-medium text-foreground/90 italic max-w-3xl mx-auto">
                  &quot;We&apos;re not just building software—we&apos;re building the future of legal practice. One where technology amplifies human expertise instead of replacing it.&quot;
                </blockquote>
                <cite className="block mt-4 text-indigo-600 font-semibold">
                  — The VeriLex AI Team
                </cite>
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section className="py-20">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Roadmap
            </h2>
            
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-indigo-200 dark:bg-indigo-800"></div>
                
                <div className="space-y-8">
                  {ROADMAP.map((item, index) => (
                    <div key={item.title} className="relative flex items-start">
                      <div className={`absolute left-2 md:left-6 w-4 h-4 rounded-full border-2 ${
                        item.status === 'completed' ? 'bg-green-500 border-green-500' :
                        item.status === 'current' ? 'bg-indigo-500 border-indigo-500' :
                        'bg-background border-gray-300'
                      }`}></div>
                      
                      <div className="ml-12 md:ml-16 flex-1">
                        <div className="bg-background border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <span className="text-xl">{item.icon}</span>
                              {item.title}
                            </h3>
                            <span className="text-sm text-foreground/60 font-medium">
                              {item.date}
                            </span>
                          </div>
                          <p className="text-foreground/70">{item.desc}</p>
                          {item.status === 'current' && (
                            <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                              In Progress
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Waitlist */}
          <section
  id="waitlist"
  className="w-full bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-t border-border py-24"
>
  <div className="px-4 max-w-4xl mx-auto text-center">
    <h2 className="text-3xl md:text-4xl font-bold mb-6">
      Join the Waitlist
    </h2>
    <p className="text-lg text-foreground/70 mb-10 max-w-2xl mx-auto">
      Early adopters receive priority onboarding, exclusive lifetime discounts, and direct access to our founding team.
    </p>

    <div className="bg-background/50 rounded-xl p-8 border border-border shadow-md">
      <h3 className="text-2xl font-semibold mb-4">Join the Waitlist</h3>
      <p className="text-foreground/70 mb-6">
        Early adopters get beta access, direct feedback opportunities, and exclusive offers.
      </p>
      <div className="max-w-md mx-auto">
        <WaitlistForm />
      </div>
    </div>
  </div>
</section>

          {/* FAQ */}
          <section className="py-20">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            
            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: 'Is VeriLex AI a law firm?',
                  a: 'No. VeriLex AI is a legal-automation platform and does not provide legal advice. Always consult a licensed attorney for legal matters.',
                },
                {
                  q: 'When does beta access start?',
                  a: 'Closed beta begins October 1st, 2025 for the first 50 firms on the waitlist. Private alpha testing starts in August 2025.',
                },
                {
                  q: 'How secure is my data?',
                  a: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We are pursuing SOC 2 Type II certification and never train our AI on client data.',
                },
                {
                  q: 'Do I need to install anything?',
                  a: 'No installations needed. VeriLex AI runs entirely in the cloud and is accessible from any modern browser.',
                },
                {
                  q: 'What practice areas are supported?',
                  a: 'We\'re starting with divorce/family law, but will expand to immigration, estate planning, and business law by Q1 2026.',
                },
                {
                  q: 'How much will it cost?',
                  a: 'We\'re finalizing tiered pricing based on firm size. Early waitlist members will receive exclusive lifetime discounts up to 50% off.',
                },
                {
                  q: 'Can I request features?',
                  a: 'Absolutely. We prioritize feedback from beta users and solo firms when planning new features. Your input shapes our roadmap.',
                },
                {
                  q: 'What makes VeriLex AI different?',
                  a: 'Unlike generic AI tools, VeriLex AI is built specifically for legal workflows with attorney-client privilege protection and legal-specific training.',
                },
              ].map(({ q, a }) => (
                <details key={q} className="group bg-background border border-border rounded-lg">
                  <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-foreground/5 transition-colors">
                    <span className="font-semibold text-left">{q}</span>
                    <ChevronRight className="h-5 w-5 text-foreground/40 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-6 pb-6">
                    <p className="text-foreground/70 leading-relaxed">{a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="py-20 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Get In Touch
              </h2>
              <p className="text-lg text-foreground/70 mb-8">
                Questions about VeriLex AI? Partnership opportunities? We&apos;d love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="mailto:founder@verilex.us"
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Contact Founder
                  <ChevronRight className="h-4 w-4" />
                </a>
                <a
                  href="#waitlist"
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-600 px-6 py-3 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                >
                  Join Waitlist
                </a>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-background/50 py-12">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-sm text-foreground/60 mb-4">
              VeriLex AI is <strong>not a law firm</strong> and does not provide legal advice.
              <br />
              Always consult with a licensed attorney for legal matters.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-foreground/60 hover:text-indigo-600 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-foreground/60 hover:text-indigo-600 transition-colors"
              >
                Terms of Service
              </Link>
              <span className="text-foreground/40">
                © 2025 VeriLex AI
              </span>
            </div>
          </div>
        </footer>

        {/* Components */}
        <CookieBanner />
        <Analytics />
      </div>
    </>
  );
}