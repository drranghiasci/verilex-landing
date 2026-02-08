'use client';

import Link from 'next/link';
import {
  ChevronDown,
  FileText,
  ClipboardCheck,
  MessageSquare,
  ShieldCheck,
  Lock,
  Eye,
  Scale,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CookieBanner from '@/components/CookieBanner';
import { Analytics } from '@vercel/analytics/react';
import ThemeToggle from '@/components/ThemeToggle';
import VerilexLogo from '@/components/VerilexLogo';

/* ========================================================================== */
/* ANIMATION VARIANTS                                                         */
/* ========================================================================== */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: 'easeOut' as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardHover = {
  rest: { y: 0, transition: { duration: 0.2 } },
  hover: { y: -3, transition: { duration: 0.2 } },
};

/* ========================================================================== */
/* SUB-COMPONENTS                                                             */
/* ========================================================================== */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px w-8 bg-[var(--accent)]" />
      <span className="text-xs font-semibold tracking-[0.14em] uppercase text-[var(--accent)]">
        {children}
      </span>
    </div>
  );
}

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <h2
      className={`text-[1.75rem] md:text-[2.25rem] tracking-tight text-[var(--text)] leading-[1.2] ${center ? 'text-center' : ''
        }`}
      style={{ fontWeight: 580 }}
    >
      {children}
    </h2>
  );
}

function SectionSubtext({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p
      className={`mt-4 text-base md:text-lg text-[var(--muted)] leading-relaxed max-w-2xl ${center ? 'text-center mx-auto' : ''
        }`}
      style={{ fontWeight: 420 }}
    >
      {children}
    </p>
  );
}

/* Hero UI frame */
function HeroUIFrame() {
  const steps = [
    { label: 'Client Intake', sub: 'Structured questions collected', done: true },
    { label: 'Attorney Review', sub: 'Case record organized', active: true },
    { label: 'Ready to Submit', sub: 'Complete for counsel', done: false },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' as const }}
      className="relative w-full max-w-[400px] mx-auto lg:mx-0"
    >
      {/* Glow behind card */}
      <div className="hero-glow hidden lg:block" />

      <div className="card-premium p-6 relative z-10">
        {/* Window chrome */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/50" />
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-[var(--accent)]" />
            <span className="text-[11px] font-medium text-[var(--muted)] tracking-wide">
              Family Law · Case #1042
            </span>
          </div>
        </div>

        {/* Step cards */}
        <div className="space-y-2.5">
          {steps.map((step, i) => (
            <div
              key={step.label}
              className={`flex items-center gap-3.5 rounded-[10px] border p-3.5 transition-all ${step.active
                  ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                  : step.done
                    ? 'border-[var(--border-subtle)] bg-[var(--surface-2)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface)]'
                }`}
            >
              <div
                className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-xs font-bold shrink-0 ${step.done
                    ? 'bg-[#22C55E] text-white'
                    : step.active
                      ? 'border-2 border-[var(--accent)] text-[var(--accent)] bg-transparent'
                      : 'border border-[var(--border)] text-[var(--muted)] bg-[var(--surface-2)]'
                  }`}
              >
                {step.done ? '✓' : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text)]">{step.label}</div>
                <div className="text-[11px] text-[var(--muted)] mt-0.5">{step.sub}</div>
              </div>
              {step.active && (
                <div className="relative w-2 h-2">
                  <div className="absolute inset-0 rounded-full bg-[var(--accent)] animate-ping opacity-40" />
                  <div className="absolute inset-0 rounded-full bg-[var(--accent)]" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between text-[11px] font-medium text-[var(--muted)] mb-2">
            <span>Intake progress</span>
            <span className="text-[var(--accent)]">67%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]"
              initial={{ width: 0 }}
              animate={{ width: '67%' }}
              transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' as const }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* FAQ Item */
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      className="border border-[var(--border)] rounded-[10px] overflow-hidden bg-[var(--surface)] transition-shadow hover:shadow-[var(--shadow-sm)]"
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <span className="text-[15px] font-medium text-[var(--text)] pr-4" style={{ fontWeight: 520 }}>
          {q}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' as const }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-0">
              <p className="text-sm text-[var(--muted)] leading-relaxed" style={{ fontWeight: 420 }}>
                {a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ========================================================================== */
/* MAIN PAGE                                                                  */
/* ========================================================================== */

export default function Home() {
  return (
    <>
      <div className="relative min-h-screen">
        {/* ─── HEADER ─── */}
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--header-bg)] backdrop-blur-xl">
          <nav
            className="flex h-[56px] w-full items-center justify-between px-5 sm:px-8 max-w-[1200px] mx-auto"
            aria-label="Main Navigation"
          >
            <Link
              href="https://verilex.us"
              className="relative flex items-center focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-lg"
            >
              <VerilexLogo className="w-[110px] h-auto object-contain" />
            </Link>

            <div className="flex items-center gap-1 sm:gap-5">
              <div className="hidden md:flex items-center gap-5 text-[13px] text-[var(--muted)]" style={{ fontWeight: 480 }}>
                <a href="#product" className="hover:text-[var(--text)] transition-colors py-1">Product</a>
                <a href="#security" className="hover:text-[var(--text)] transition-colors py-1">Security</a>
                <a href="#roadmap" className="hover:text-[var(--text)] transition-colors py-1">Roadmap</a>
                <a href="#faq" className="hover:text-[var(--text)] transition-colors py-1">FAQ</a>
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

        {/* ─── MAIN ─── */}
        <main>
          {/* ═══════ HERO ═══════ */}
          <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-5 overflow-hidden">
            <div className="hero-glow-top" />
            <div className="max-w-[1200px] mx-auto relative z-10">
              <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
                {/* Left */}
                <motion.div initial="hidden" animate="visible" variants={stagger}>
                  <motion.div variants={fadeUp} custom={0}>
                    <div className="badge mb-6">
                      <Sparkles className="h-3 w-3" />
                      Now in private beta
                    </div>
                  </motion.div>

                  <motion.h1
                    custom={1}
                    variants={fadeUp}
                    className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.5rem] tracking-tight leading-[1.08] text-[var(--text)]"
                    style={{ fontWeight: 600 }}
                  >
                    Legal intake and case
                    <br />
                    <span className="text-[var(--accent)]">infrastructure</span> for
                    <br />
                    modern firms.
                  </motion.h1>

                  <motion.p
                    custom={2}
                    variants={fadeUp}
                    className="mt-5 text-base md:text-[17px] text-[var(--muted)] max-w-md leading-[1.7]"
                    style={{ fontWeight: 420 }}
                  >
                    Structured intake that captures what matters. Reviewable case records
                    your team can trust. Client interaction tools — coming soon.
                  </motion.p>

                  <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                    <Link href="/firm-intake" className="btn-primary">
                      Request access
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a href="#product" className="btn-secondary">
                      See how it works
                    </a>
                  </motion.div>
                </motion.div>

                {/* Right */}
                <HeroUIFrame />
              </div>
            </div>
          </section>

          {/* ═══════ THREE PILLARS ═══════ */}
          <section id="product" className="py-20 md:py-28 px-5 bg-dots">
            <div className="max-w-[1200px] mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={stagger}
                className="text-center mb-14"
              >
                <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center">
                  <SectionLabel>What we build</SectionLabel>
                </motion.div>
                <motion.div variants={fadeUp} custom={1}>
                  <SectionHeading center>
                    Three pillars of modern legal infrastructure
                  </SectionHeading>
                </motion.div>
                <motion.div variants={fadeUp} custom={2}>
                  <SectionSubtext center>
                    Each component is designed to work independently or together — giving your firm exactly what it needs.
                  </SectionSubtext>
                </motion.div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="grid md:grid-cols-3 gap-5"
              >
                {[
                  {
                    icon: <FileText className="h-5 w-5" strokeWidth={1.8} />,
                    title: 'Structured Intake',
                    desc: 'Guided conversations capture client statements with consistency. Every response is organized and reviewable — no chasing details after the fact.',
                  },
                  {
                    icon: <ClipboardCheck className="h-5 w-5" strokeWidth={1.8} />,
                    title: 'Case Review & Organization',
                    desc: 'Clean, structured records ready for attorney review. Client-provided information is presented step by step, organized by topic.',
                  },
                  {
                    icon: <MessageSquare className="h-5 w-5" strokeWidth={1.8} />,
                    title: 'Secure Client Interaction',
                    desc: 'Client portal and messaging tools for follow-ups and document exchange. Built for secure, accountable communication.',
                    badge: 'In progress',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.title}
                    custom={i}
                    variants={fadeUp}
                    whileHover="hover"
                    initial="rest"
                    animate="rest"
                  >
                    <motion.div variants={cardHover} className="card-premium p-6 h-full">
                      {item.badge && (
                        <div className="flex justify-end mb-2">
                          <span className="badge text-[10px]">{item.badge}</span>
                        </div>
                      )}
                      <div className={`icon-container icon-container-lg ${item.badge ? '' : 'mb-5'}`}>
                        {item.icon}
                      </div>
                      <h3
                        className="text-[15px] text-[var(--text)] mb-2 mt-5"
                        style={{ fontWeight: 600 }}
                      >
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[var(--muted)] leading-relaxed" style={{ fontWeight: 420 }}>
                        {item.desc}
                      </p>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          <div className="section-divider max-w-[1200px] mx-auto" />

          {/* ═══════ HOW IT WORKS ═══════ */}
          <section className="py-20 md:py-28 px-5">
            <div className="max-w-[1200px] mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={stagger}
                className="text-center mb-16"
              >
                <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center">
                  <SectionLabel>How it works</SectionLabel>
                </motion.div>
                <motion.div variants={fadeUp} custom={1}>
                  <SectionHeading center>From intake to organized record</SectionHeading>
                </motion.div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="grid md:grid-cols-3 gap-10"
              >
                {[
                  {
                    step: '1',
                    title: 'Client completes structured intake',
                    desc: 'A guided conversation captures statements, documents, and key details — organized by topic, not by guesswork.',
                  },
                  {
                    step: '2',
                    title: 'Firm reviews a clean, organized record',
                    desc: 'Every client response is structured into reviewable sections. No digging through emails or handwritten notes.',
                  },
                  {
                    step: '3',
                    title: 'Follow-ups and client communication',
                    desc: 'Secure messaging and document exchange for ongoing client interaction.',
                    badge: 'In progress',
                  },
                ].map((item, i) => (
                  <motion.div key={item.step} custom={i} variants={fadeUp} className="flex gap-4">
                    <div className="step-number mt-1">{item.step}</div>
                    <div className="flex-1">
                      <h3 className="text-[15px] text-[var(--text)] mb-2" style={{ fontWeight: 590 }}>
                        {item.title}
                      </h3>
                      <p className="text-[13px] text-[var(--muted)] leading-relaxed" style={{ fontWeight: 420 }}>
                        {item.desc}
                      </p>
                      {item.badge && <span className="badge mt-3 inline-flex">{item.badge}</span>}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          <div className="section-divider max-w-[1200px] mx-auto" />

          {/* ═══════ SECURITY & TRUST ═══════ */}
          <section id="security" className="py-20 md:py-28 px-5 bg-dots">
            <div className="max-w-[1200px] mx-auto">
              <div className="grid lg:grid-cols-[1fr_1.2fr] gap-16 items-start">
                {/* Left – heading */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-100px' }}
                  variants={stagger}
                >
                  <motion.div variants={fadeUp} custom={0}>
                    <SectionLabel>Security &amp; Trust</SectionLabel>
                  </motion.div>
                  <motion.div variants={fadeUp} custom={1}>
                    <SectionHeading>
                      Built with privacy and compliance in mind
                    </SectionHeading>
                  </motion.div>
                  <motion.div variants={fadeUp} custom={2}>
                    <SectionSubtext>
                      Every design decision prioritizes the protection of client information and the integrity of legal records.
                    </SectionSubtext>
                  </motion.div>
                </motion.div>

                {/* Right – cards */}
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  variants={stagger}
                  className="grid sm:grid-cols-2 gap-4"
                >
                  {[
                    {
                      icon: <Lock className="h-[18px] w-[18px]" strokeWidth={1.8} />,
                      title: 'Role-based access',
                      desc: 'Firm administrators control who can view, edit, or submit intake records.',
                    },
                    {
                      icon: <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />,
                      title: 'Audit-friendly records',
                      desc: 'Every field change is tracked. Records are structured for easy review.',
                    },
                    {
                      icon: <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />,
                      title: 'Privacy-first design',
                      desc: 'Encrypted in transit and at rest. We do not train AI on client information.',
                    },
                    {
                      icon: <Scale className="h-[18px] w-[18px]" strokeWidth={1.8} />,
                      title: 'Designed toward compliance',
                      desc: 'Architecture built with SOC 2 and data protection principles in mind.',
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      custom={i}
                      variants={fadeUp}
                      whileHover="hover"
                      initial="rest"
                      animate="rest"
                    >
                      <motion.div variants={cardHover} className="card-premium p-5 h-full">
                        <div className="icon-container mb-4">
                          {item.icon}
                        </div>
                        <h3
                          className="text-[14px] text-[var(--text)] mb-1.5"
                          style={{ fontWeight: 580 }}
                        >
                          {item.title}
                        </h3>
                        <p className="text-[13px] text-[var(--muted)] leading-relaxed" style={{ fontWeight: 420 }}>
                          {item.desc}
                        </p>
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </section>

          <div className="section-divider max-w-[1200px] mx-auto" />

          {/* ═══════ ROADMAP ═══════ */}
          <section id="roadmap" className="py-20 md:py-28 px-5">
            <div className="max-w-[1200px] mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={stagger}
                className="text-center mb-14"
              >
                <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center">
                  <SectionLabel>Roadmap</SectionLabel>
                </motion.div>
                <motion.div variants={fadeUp} custom={1}>
                  <SectionHeading center>
                    Where we are and where we&apos;re going
                  </SectionHeading>
                </motion.div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                variants={stagger}
                className="grid md:grid-cols-3 gap-5"
              >
                {[
                  {
                    phase: 'Now',
                    dotClass: 'roadmap-dot-active',
                    items: [
                      'Structured family law intake',
                      'Case record review for attorneys',
                      'Firm onboarding and branding',
                      'Role-based access controls',
                    ],
                  },
                  {
                    phase: 'Next',
                    dotClass: 'roadmap-dot-next',
                    items: [
                      'Client portal and secure messaging',
                      'Document upload and management',
                      'Additional practice areas',
                      'Enhanced reporting and analytics',
                    ],
                  },
                  {
                    phase: 'Later',
                    dotClass: 'roadmap-dot-later',
                    items: [
                      'Multi-jurisdiction support',
                      'Third-party integrations',
                      'Advanced workflow automation',
                      'API access for custom builds',
                    ],
                  },
                ].map((col, i) => (
                  <motion.div
                    key={col.phase}
                    custom={i}
                    variants={fadeUp}
                    whileHover="hover"
                    initial="rest"
                    animate="rest"
                  >
                    <motion.div variants={cardHover} className="card-premium p-6 h-full">
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`roadmap-dot ${col.dotClass}`} />
                        <h3 className="text-base text-[var(--text)]" style={{ fontWeight: 600 }}>
                          {col.phase}
                        </h3>
                      </div>
                      <ul className="space-y-3">
                        {col.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2.5 text-[13px] text-[var(--muted)]"
                            style={{ fontWeight: 420 }}
                          >
                            <ChevronRight className="h-3.5 w-3.5 mt-[3px] text-[var(--accent)] shrink-0" strokeWidth={2} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </section>

          <div className="section-divider max-w-[1200px] mx-auto" />

          {/* ═══════ FAQ ═══════ */}
          <section id="faq" className="py-20 md:py-28 px-5">
            <div className="max-w-[680px] mx-auto">
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
                variants={stagger}
                className="text-center mb-12"
              >
                <motion.div variants={fadeUp} custom={0} className="flex items-center justify-center">
                  <SectionLabel>FAQ</SectionLabel>
                </motion.div>
                <motion.div variants={fadeUp} custom={1}>
                  <SectionHeading center>Frequently asked questions</SectionHeading>
                </motion.div>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={stagger}
                className="space-y-2.5"
              >
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
                    a: 'Yes. Firms can customize intake branding, logo, and configuration through the MyClient portal. Practice-area-specific intake flows are supported and expanding.',
                  },
                  {
                    q: 'What practice areas are supported?',
                    a: 'We currently support family law intakes including divorce and custody matters. Additional practice areas are on our roadmap.',
                  },
                  {
                    q: 'How does pricing work?',
                    a: 'We offer tiered pricing based on firm size with options for annual commitments. Contact us for details on current plans and availability.',
                  },
                  {
                    q: 'Can I request features or provide feedback?',
                    a: 'Absolutely. We actively incorporate feedback from firms using the platform. Reach out through our feedback page or contact us directly.',
                  },
                ].map((item, i) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} index={i} />
                ))}
              </motion.div>
            </div>
          </section>
        </main>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-[var(--border)] py-8 px-5">
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[12px] text-[var(--muted)]" style={{ fontWeight: 420 }}>
              © {new Date().getFullYear()} VeriLex AI · Not a law firm · Does not provide legal advice
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
    </>
  );
}
