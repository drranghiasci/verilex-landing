'use client';

import Link from 'next/link';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  ScaleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';
import ThemeToggle from '@/components/ThemeToggle';
import VerilexLogo from '@/components/VerilexLogo';

/* ── animation variants ── */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

/* ── FAQ ── */

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-5 text-left cursor-pointer group"
        aria-expanded={open}
      >
        <span
          className="text-[15px] text-[var(--text)] pr-8 group-hover:text-[var(--accent)] transition-colors"
          style={{ fontWeight: 500 }}
        >
          {q}
        </span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDownIcon className="h-4 w-4 text-[var(--muted)]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-[14px] text-[var(--muted)] leading-[1.7] max-w-2xl" style={{ fontWeight: 420 }}>
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Hero UI frame ── */

function HeroUIFrame() {
  const steps = [
    { label: 'Client Intake', sub: 'Structured questions collected', done: true },
    { label: 'Attorney Review', sub: 'Case record organized', active: true },
    { label: 'Ready to Submit', sub: 'Complete for counsel', done: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const }}
      className="card-glass p-5 w-full max-w-[380px]"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-60" />
        <span className="text-[11px] text-[var(--muted)] tracking-wide" style={{ fontWeight: 480 }}>
          Family Law · Case #1042
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 rounded-xl p-3 transition-all ${step.active
              ? 'bg-[var(--accent-muted)] border border-[var(--accent)]'
              : 'border border-[var(--border-subtle)]'
              }`}
          >
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] shrink-0 ${step.done
                ? 'bg-emerald-500 text-white font-bold'
                : step.active
                  ? 'border-[1.5px] border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'text-[var(--muted)] font-medium'
                }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-[var(--text)]" style={{ fontWeight: 540 }}>{step.label}</div>
              <div className="text-[11px] text-[var(--muted)]">{step.sub}</div>
            </div>
            {step.active && (
              <div className="ml-auto relative w-1.5 h-1.5">
                <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-40" />
                <div className="absolute inset-0 rounded-full bg-[var(--accent)]" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
        <div className="flex justify-between text-[11px] text-[var(--muted)] mb-1.5" style={{ fontWeight: 480 }}>
          <span>Intake progress</span>
          <span className="text-[var(--accent)]">67%</span>
        </div>
        <div className="h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: '67%' }}
            transition={{ duration: 1, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════ */
/* PAGE                                                                         */
/* ══════════════════════════════════════════════════════════════════════════════ */

export default function Home() {
  return (
    <div className="grain relative min-h-screen">
      {/* ── HEADER ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
        <nav className="flex h-14 items-center justify-between px-5 sm:px-8 max-w-[1100px] mx-auto">
          <Link href="https://verilex.us" className="focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg">
            <VerilexLogo className="w-[110px] h-auto" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-5">
            <div className="hidden md:flex items-center gap-6 text-[13px] text-[var(--muted)]" style={{ fontWeight: 460 }}>
              <a href="#features" className="hover:text-[var(--text)] transition-colors">Features</a>
              <a href="#security" className="hover:text-[var(--text)] transition-colors">Security</a>
              <a href="#faq" className="hover:text-[var(--text)] transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-2.5 ml-2">
              <ThemeToggle />
              <Link href="/firm-intake" className="btn-primary hidden sm:inline-flex">
                Request access
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* ── MAIN ── */}
      <main>

        {/* ═════ HERO ═════ */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-24 px-5">
          <div className="max-w-[1100px] mx-auto">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center max-w-3xl mx-auto">

              <motion.p
                variants={fadeUp}
                custom={0}
                className="text-[13px] text-[var(--muted)] tracking-wide mb-6"
                style={{ fontWeight: 480 }}
              >
                Now in private beta
              </motion.p>

              <motion.h1
                variants={fadeUp}
                custom={1}
                className="text-[2.75rem] md:text-[3.75rem] lg:text-[4.25rem] leading-[1.05] tracking-[-0.035em] text-[var(--text)]"
                style={{ fontWeight: 600 }}
              >
                Legal intake and case
                <br />
                <span className="text-gradient">infrastructure</span> for
                <br className="hidden sm:block" />
                {' '}modern firms
              </motion.h1>

              <motion.p
                variants={fadeUp}
                custom={2}
                className="mt-6 text-[16px] md:text-[18px] text-[var(--muted)] leading-[1.7] max-w-xl mx-auto"
                style={{ fontWeight: 420 }}
              >
                Structured intake that captures what matters. Reviewable case records
                your team can trust. Built for the way firms actually work.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/firm-intake" className="btn-primary">
                  Request access
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <a href="#features" className="btn-secondary">Learn more</a>
              </motion.div>
            </motion.div>

            {/* Hero UI frame — centered below */}
            <div className="mt-16 flex justify-center">
              <HeroUIFrame />
            </div>
          </div>
        </section>

        {/* ═════ FEATURES — Bento Grid ═════ */}
        <section id="features" className="py-16 md:py-24 px-5">
          <div className="max-w-[1100px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              variants={stagger}
            >
              <motion.p
                variants={fadeUp}
                custom={0}
                className="text-[13px] text-[var(--accent)] tracking-wide mb-3"
                style={{ fontWeight: 550 }}
              >
                WHAT WE BUILD
              </motion.p>
              <motion.h2
                variants={fadeUp}
                custom={1}
                className="text-[1.75rem] md:text-[2.5rem] tracking-[-0.03em] text-[var(--text)] leading-[1.1] mb-10"
                style={{ fontWeight: 580 }}
              >
                Three pillars of modern
                <br className="hidden sm:block" />
                {' '}legal infrastructure
              </motion.h2>
            </motion.div>

            {/* Bento layout: 1 large + 1 medium on first row, 1 full-width on second */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
              className="grid md:grid-cols-5 gap-4"
            >
              {/* Large card — 3 cols */}
              <motion.div variants={fadeUp} custom={0} className="bento-card md:col-span-3">
                <p className="text-[var(--accent)] text-[13px] mb-3" style={{ fontWeight: 560 }}>
                  Structured Intake
                </p>
                <h3
                  className="text-[1.25rem] md:text-[1.5rem] text-[var(--text)] tracking-[-0.02em] leading-[1.2] mb-3"
                  style={{ fontWeight: 580 }}
                >
                  Guided conversations that capture client statements with consistency
                </h3>
                <p className="text-[14px] text-[var(--muted)] leading-[1.7] max-w-lg" style={{ fontWeight: 420 }}>
                  Every response is organized and reviewable — no chasing details after the fact.
                  Clients complete intake at their own pace, on any device.
                </p>
              </motion.div>

              {/* Medium card — 2 cols */}
              <motion.div variants={fadeUp} custom={1} className="bento-card md:col-span-2">
                <p className="text-[var(--accent)] text-[13px] mb-3" style={{ fontWeight: 560 }}>
                  Case Review
                </p>
                <h3
                  className="text-[1.15rem] md:text-[1.3rem] text-[var(--text)] tracking-[-0.02em] leading-[1.2] mb-3"
                  style={{ fontWeight: 580 }}
                >
                  Clean, structured records ready for attorney review
                </h3>
                <p className="text-[14px] text-[var(--muted)] leading-[1.7]" style={{ fontWeight: 420 }}>
                  Client-provided information is presented step by step, organized by topic.
                  No digging through emails.
                </p>
              </motion.div>

              {/* Full-width card */}
              <motion.div variants={fadeUp} custom={2} className="bento-card md:col-span-5">
                <div className="md:flex md:items-start md:justify-between md:gap-12">
                  <div className="md:max-w-md">
                    <p className="text-[var(--accent)] text-[13px] mb-3" style={{ fontWeight: 560 }}>
                      Secure Client Interaction
                    </p>
                    <h3
                      className="text-[1.15rem] md:text-[1.3rem] text-[var(--text)] tracking-[-0.02em] leading-[1.2] mb-3"
                      style={{ fontWeight: 580 }}
                    >
                      Client portal and messaging built for accountable communication
                    </h3>
                  </div>
                  <p className="text-[14px] text-[var(--muted)] leading-[1.7] md:max-w-sm md:pt-6" style={{ fontWeight: 420 }}>
                    Follow-ups, document exchange, and status updates — all in one place.
                    Every interaction is logged and auditable.
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ═════ TRUST BAR ═════ */}
        <section id="security" className="py-12 md:py-16 px-5 border-y border-[var(--border)]">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
            className="max-w-[1100px] mx-auto"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-[13px] text-[var(--accent)] tracking-wide mb-6"
              style={{ fontWeight: 550 }}
            >
              SECURITY & TRUST
            </motion.p>
            <motion.div
              variants={fadeUp}
              custom={1}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
            >
              <div className="trust-item">
                <LockClosedIcon />
                <span>Role-based access controls</span>
              </div>
              <div className="trust-item">
                <EyeIcon />
                <span>Audit-friendly records</span>
              </div>
              <div className="trust-item">
                <ShieldCheckIcon />
                <span>Encrypted in transit & at rest</span>
              </div>
              <div className="trust-item">
                <ScaleIcon />
                <span>Designed toward SOC 2</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ═════ FAQ ═════ */}
        <section id="faq" className="py-16 md:py-24 px-5">
          <div className="max-w-[640px] mx-auto">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={stagger}
            >
              <motion.h2
                variants={fadeUp}
                custom={0}
                className="text-[1.5rem] md:text-[2rem] tracking-[-0.03em] text-[var(--text)] mb-8"
                style={{ fontWeight: 580 }}
              >
                Questions & answers
              </motion.h2>
              <motion.div variants={fadeUp} custom={1}>
                {[
                  {
                    q: 'Is this legal advice?',
                    a: 'No. VeriLex is a technology platform that helps organize legal intake and case information. It does not provide legal advice. All information captured represents statements provided by the client — not verified facts.',
                  },
                  {
                    q: 'Does VeriLex replace my attorney?',
                    a: 'No. VeriLex is designed to support attorneys and law firms by streamlining intake and case organization. It is a tool for legal professionals, not a substitute for legal counsel.',
                  },
                  {
                    q: 'How is my data handled?',
                    a: 'All data is encrypted in transit and at rest. We implement role-based access controls and audit-friendly record-keeping. We do not use client data to train AI models.',
                  },
                  {
                    q: 'Can my firm customize the intake?',
                    a: 'Yes. Firms can customize intake branding, logo, and configuration through the MyClient portal. Practice-area-specific intake flows are supported.',
                  },
                  {
                    q: 'What practice areas are supported?',
                    a: 'We currently support family law intakes including divorce and custody matters. Additional practice areas are actively being added.',
                  },
                  {
                    q: 'How does pricing work?',
                    a: 'We offer tiered pricing based on firm size with options for annual commitments. Contact us for details on current plans.',
                  },
                ].map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--border)] py-8 px-5">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[var(--muted)]" style={{ fontWeight: 420 }}>
            © {new Date().getFullYear()} VeriLex · Not a law firm · Does not provide legal advice
          </p>
          <div className="flex items-center gap-5 text-[12px] text-[var(--muted)]" style={{ fontWeight: 450 }}>
            <Link href="/privacy" className="hover:text-[var(--text)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--text)] transition-colors">Terms</Link>
            <a href="mailto:contact@verilex.us" className="hover:text-[var(--text)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      <CookieBanner />
      <Analytics />
    </div>
  );
}
