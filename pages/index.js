import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';
import { useEffect, useState } from 'react';

export default function Home() {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + 6);

    const updateCountdown = () => {
      const now = new Date();
      const timeLeft = targetDate - now;

      const months = Math.floor(timeLeft / (1000 * 60 * 60 * 24 * 30));
      const days = Math.floor((timeLeft / (1000 * 60 * 60 * 24)) % 30);
      const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
      setCountdown(`${months}mo ${days}d ${hours}h ${minutes}m`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Fixed logo in top-left */}
      <header className="fixed top-6 left-6 z-50">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={300}
          height={100}
          priority
        />
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-6 py-40">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6 animate-fade-in">
          Your AI-Powered Legal Assistant
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 animate-fade-in-delay">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>
        <div className="w-full max-w-md animate-fade-in-delay">
          <WaitlistForm />
        </div>
      </main>

      {/* Countdown Section */}
      <section className="bg-white py-12 text-center">
        <h2 className="text-2xl font-semibold mb-2">Official Launch In</h2>
        <p className="text-3xl font-bold text-blue-600">{countdown}</p>
      </section>

      {/* Extended Features Section */}
      <section className="px-6 py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">What You Can Do with VeriLex AI</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <li className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-lg mb-2">Instant Legal Research</h3>
              <p className="text-gray-600">Ask questions in plain English and get cited legal insights instantly.</p>
            </li>
            <li className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-lg mb-2">Case Summaries</h3>
              <p className="text-gray-600">Upload and summarize opinions, rulings, and filings in seconds.</p>
            </li>
            <li className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-lg mb-2">Contract Review</h3>
              <p className="text-gray-600">Spot red flags and get simplified breakdowns of contract clauses.</p>
            </li>
            <li className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
              <h3 className="font-semibold text-lg mb-2">Smart Drafting Tools</h3>
              <p className="text-gray-600">Generate demand letters, NDAs, retainer agreements, and more.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">6-Month Product Roadmap</h2>
          <ul className="space-y-6">
            <li>
              <strong>Month 1:</strong> Launch waitlist and beta signups
            </li>
            <li>
              <strong>Month 2:</strong> Release AI research & case summarization tools to early users
            </li>
            <li>
              <strong>Month 3:</strong> Launch contract analyzer and risk-flagging
            </li>
            <li>
              <strong>Month 4:</strong> Open AI chat assistant for legal Q&A
            </li>
            <li>
              <strong>Month 5:</strong> Launch document generation tools
            </li>
            <li>
              <strong>Month 6:</strong> Open to public, add subscription plans and integrations
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <ul className="space-y-6">
            <li>
              <strong>Is VeriLex AI a law firm?</strong>
              <p className="text-gray-600">No, VeriLex AI provides legal automation tools and does not offer legal advice.</p>
            </li>
            <li>
              <strong>Who can use VeriLex?</strong>
              <p className="text-gray-600">VeriLex is built for solo attorneys and small firms needing time-saving tools.</p>
            </li>
            <li>
              <strong>Can I try it before launch?</strong>
              <p className="text-gray-600">Yes — join the waitlist for beta access to upcoming tools.</p>
            </li>
          </ul>
        </div>
      </section>

      <footer className="text-center text-sm text-gray-400 py-10">
        VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
      </footer>
    </div>
  );
}
