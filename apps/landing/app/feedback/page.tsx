'use client';

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function FeedbackPage() {
  return (
    <>
      <Head>
        <title>VeriLex AI | Feedback</title>
        <meta name="description" content="Share feedback with the VeriLex AI team." />
      </Head>

      <div className="relative min-h-screen scroll-smooth">
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--surface-0)] backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main Navigation">
            <Link href="/" className="relative flex items-center focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded-lg">
              <Image
                src="/verilex-logo-name.png"
                alt="VeriLex AI"
                width={150}
                height={46}
                priority
                unoptimized
                className="object-contain transition-opacity duration-500 ease-in-out dark:opacity-0"
              />
              <Image
                src="/verilex-logo-name-darkmode.png"
                alt="VeriLex AI (dark)"
                width={150}
                height={46}
                priority
                unoptimized
                className="absolute inset-0 object-contain opacity-0 transition-opacity duration-500 ease-in-out dark:opacity-100"
              />
            </Link>
            <div className="flex items-center gap-3 text-sm font-medium sm:gap-6">
              <ThemeToggle />
              <span className="text-[color:var(--accent-soft)]">Feedback</span>
              <Link href="/firm-intake" className="hover:text-[color:var(--accent-soft)] transition-colors">
                New Firm Intake
              </Link>
              <Link
                href="https://myclient.verilex.us/myclient/app"
                className="rounded-lg border border-[color:var(--accent-light)] px-4 py-1.5 text-[color:var(--accent-soft)] hover:bg-[color:var(--accent-light)] hover:text-white transition-all"
              >
                MyClient Portal
              </Link>
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">Feedback</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">We&apos;re listening.</h1>
            <p className="mt-4 text-lg text-[color:var(--text-2)]">
              We&apos;re building VeriLex AI with early firm input. Share feedback below.
            </p>
            <p className="mt-6 text-base text-[color:var(--text-2)]">Feedback form coming soon.</p>
            <Link
              href="/"
              className="mt-8 inline-flex items-center justify-center rounded-lg border border-[color:var(--accent-light)] px-5 py-2.5 font-medium text-[color:var(--accent-soft)] transition-all hover:bg-[color:var(--accent-light)] hover:text-white hover:scale-[1.02]"
            >
              Back to home
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
