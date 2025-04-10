// Project: verilex-ai
// Created by: [Your Name]
// Date: 2023-10-01
// Description: This is the main landing page for the VeriLex AI application. It includes a countdown timer, waitlist form, and various sections explaining the product features and roadmap.
//
// Note: This code is a simplified version and may not include all necessary imports or configurations.
// Note: Ensure to replace the placeholder text and links with actual content and URLs as needed..
'use client';

import Image from 'next/image';
import Link from 'next/link';
import WaitlistForm from '../components/WaitlistForm';
import { useEffect, useState } from 'react';
import { Analytics } from "@vercel/analytics/react"

export default function Home() {
  const calculateCountdown = () => {
    const targetDate = new Date('2025-10-01T12:00:00-04:00');
    const now = new Date();
    const total = targetDate.getTime() - now.getTime();

    const months = Math.floor(total / (1000 * 60 * 60 * 24 * 30));
    const days = Math.floor((total % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);

    return { months, days, hours, minutes, seconds };
  };

  const [timeLeft, setTimeLeft] = useState(calculateCountdown());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateCountdown());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-4">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/verilex-logo-name.png"
              alt="VeriLex AI Logo"
              width={170}
              height={60}
              priority
            />
          </Link>
        </div>
        <div className="space-x-6 text-sm font-medium">
          <Link href="#waitlist" className="text-gray-700 hover:text-black transition">Join Waitlist</Link>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 transition">Beta Test Build</Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="text-center max-w-4xl mx-auto pt-32">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          Your AI-Powered Legal Assistant
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-10">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>

        {/* Waitlist Form */}
        <div id="waitlist" className="w-full max-w-md mx-auto mb-12">
          <WaitlistForm />
        </div>

        {/* Countdown Timer */}
        <div className="text-xl font-semibold text-gray-800 mb-12">
          Launching in:
          <div className="text-2xl font-mono mt-2">
            {`${timeLeft.months}mo ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
          </div>
        </div>

        {/* Why Join Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Why You Should Join the Waitlist</h2>
          <p className="text-gray-700 text-lg mb-6">
            VeriLex AI isn&apos;t just another legal tech product — it&apos;s a movement toward smarter, leaner, more effective lawyering. As a solo attorney or small firm, you know the grind: endless hours of case review, overwhelming intake, and dense contract language.
          </p>
          <p className="text-gray-700 text-lg mb-4">
            By joining the waitlist, you&apos;re gaining early access to technology designed to eliminate busywork and elevate your legal practice. You&apos;ll:
          </p>
          <ul className="text-left text-gray-700 text-lg space-y-3 max-w-3xl mx-auto">
            <li>✔️ Slash hours off research and document review</li>
            <li>✔️ Impress clients with faster, clearer deliverables</li>
            <li>✔️ Stay ahead of competitors with tools built on next-gen AI</li>
            <li>✔️ Help shape features based on real attorney workflows</li>
            <li>✔️ Get priority onboarding, support, and discounts</li>
          </ul>
        </section>

        {/* Brand Story */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">The VeriLex AI Story</h2>
          <p className="text-gray-700 text-lg">
            VeriLex AI was born out of frustration — watching brilliant attorneys waste time on tasks that could (and should) be automated. We knew there was a better way: a way to streamline, empower, and modernize the legal profession without sacrificing quality or control.
          </p>
          <p className="text-gray-700 text-lg mt-4">
            Our founding team blends legal expertise, software engineering, and AI innovation. We&apos;re not building just another tech tool — we&apos;re building the legal assistant you&apos;ve always needed, one that never sleeps, never forgets, and always delivers value.
          </p>
        </section>

        {/* Features */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Key Features</h2>
          <ul className="space-y-4 text-left mx-auto max-w-2xl">
            <li><strong>🧠 Legal Research:</strong> Get accurate, AI-assisted legal research in seconds.</li>
            <li><strong>📝 Case Summarization:</strong> Upload documents and receive clear, concise summaries instantly.</li>
            <li><strong>📄 Contract Review:</strong> Highlight risk clauses, extract key terms, and auto-generate summaries.</li>
            <li><strong>🤖 Smart Assistant:</strong> Ask questions about legal topics and get guided answers.</li>
          </ul>
        </section>

        {/* Roadmap */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Roadmap</h2>
          <ul className="space-y-4 text-left mx-auto max-w-2xl">
            <li><strong>🔒 April 2025:</strong> Secure waitlist opens for early adopters.</li>
            <li><strong>🧪 May 2025:</strong> Beta access begins for legal research and summarization tools.</li>
            <li><strong>📑 June 2025:</strong> Launch of contract analyzer and auto-summary engine.</li>
            <li><strong>⚖️ July 2025:</strong> Guided AI legal assistant for client Q&amp;A scenarios.</li>
            <li><strong>🌐 August 2025:</strong> Expansion to immigration, family, and business law domains.</li>
            <li><strong>🚀 October 1, 2025:</strong> Full public launch with integrated billing and support.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">FAQ</h2>
          <div className="space-y-6 text-left mx-auto max-w-2xl">
            <div>
              <h3 className="font-semibold">Is VeriLex AI a law firm?</h3>
              <p className="text-gray-700">No. VeriLex AI is a legal automation platform and does not offer legal advice. Always consult a licensed attorney for legal matters.</p>
            </div>
            <div>
              <h3 className="font-semibold">Who is this platform for?</h3>
              <p className="text-gray-700">Solo practitioners, small firms, and legal professionals looking to save time and improve efficiency with smart tools.</p>
            </div>
            <div>
              <h3 className="font-semibold">When does access start?</h3>
              <p className="text-gray-700">Beta testing begins in May 2025. Sign up now to secure early access before public launch.</p>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Contact</h2>
          <p className="text-gray-700">
            Got questions, feedback, or partnership ideas? Reach out directly at:<br />
            <a href="mailto:founder@verilex.us" className="text-blue-600 underline">founder@verilex.us</a>
          </p>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 py-10">
          VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
        </footer>
      </main>
    </div>
  );
}
