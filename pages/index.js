import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';
import { useEffect, useState } from 'react';

export default function Home() {
  const calculateTimeLeft = () => {
    const difference = +new Date('2025-10-01T12:00:00-04:00') - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        months: Math.floor(difference / (1000 * 60 * 60 * 24 * 30)),
        days: Math.floor((difference / (1000 * 60 * 60 * 24)) % 30),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start px-6 py-10 max-w-7xl mx-auto">
        {/* Left Content */}
        <div className="w-full md:w-2/3 space-y-12">
          {/* Hero Section */}
          <section className="text-left">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-4">Your AI-Powered Legal Assistant</h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-2xl mb-8">
              Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
            </p>
          </section>

          {/* Waitlist Section */}
          <section>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Join the Waitlist</h2>
            <p className="text-gray-600 mb-6">
              Get early access to VeriLex AI’s legal automation tools.
            </p>
            <WaitlistForm />
          </section>

          {/* Countdown Section */}
          <section>
            <h2 className="text-xl font-semibold mb-2">Launch Countdown</h2>
            <div className="text-2xl font-mono bg-white inline-block px-4 py-2 rounded shadow">
              {timeLeft.months ?? '0'} months, {timeLeft.days ?? '0'} days,{' '}
              {String(timeLeft.hours ?? '0').padStart(2, '0')}:
              {String(timeLeft.minutes ?? '0').padStart(2, '0')}:
              {String(timeLeft.seconds ?? '0').padStart(2, '0')}
            </div>
          </section>

          {/* Features Section */}
          <section>
            <h2 className="text-2xl font-bold mt-12 mb-6">Key Features</h2>
            <ul className="space-y-4">
              <li>✅ AI-powered legal research in seconds</li>
              <li>✅ Case summarization with key points extracted</li>
              <li>✅ Contract clause analysis with risk indicators</li>
              <li>✅ Custom prompts and templates for legal drafting</li>
            </ul>
          </section>

          {/* Roadmap Section */}
          <section>
            <h2 className="text-2xl font-bold mt-12 mb-6">Product Roadmap</h2>
            <ul className="space-y-4">
              <li><strong>April 2025:</strong> Waitlist opens, onboarding begins</li>
              <li><strong>May 2025:</strong> Private beta testing for early users</li>
              <li><strong>June 2025:</strong> Launch contract review + AI case summaries</li>
              <li><strong>July 2025:</strong> Integrate with popular case management tools</li>
              <li><strong>August 2025:</strong> Launch custom prompt builder + assistant memory</li>
              <li><strong>October 1, 2025:</strong> Public release</li>
            </ul>
          </section>

          {/* FAQ Section */}
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-4">FAQ</h2>
            <div className="space-y-4">
              <div>
                <strong>Is VeriLex AI a law firm?</strong>
                <p className="text-sm text-gray-600">No, VeriLex AI provides automation tools for legal workflows. It does not offer legal advice.</p>
              </div>
              <div>
                <strong>Can I use this with my practice software?</strong>
                <p className="text-sm text-gray-600">Integration with practice management platforms is in development for Summer 2025.</p>
              </div>
              <div>
                <strong>Will I be able to export my results?</strong>
                <p className="text-sm text-gray-600">Yes, summaries, findings, and annotations will be exportable as PDFs and DOCX files.</p>
              </div>
            </div>
          </section>

          <footer className="text-xs text-gray-400 mt-16">
            VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
          </footer>
        </div>

        {/* Right Logo */}
        <div className="w-full md:w-1/3 flex justify-center md:justify-end mt-10 md:mt-0">
          <Image
            src="/verilex-logo-name.png"
            alt="VeriLex AI Logo"
            width={450}
            height={150}
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
