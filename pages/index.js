import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';
import { useEffect, useState } from 'react';

export default function Home() {
  const calculateCountdown = () => {
    const targetDate = new Date('2025-10-01T12:00:00-04:00');
    const now = new Date();
    const total = targetDate - now;

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
      <div className="flex flex-col items-center justify-start pt-10">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={450}
          height={140}
          priority
        />
      </div>

      <main className="text-center max-w-4xl mx-auto pt-10">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          Your AI-Powered Legal Assistant
        </h1>
        <p className="text-lg md:text-xl text-gray-700 mb-10">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>
        <div className="w-full max-w-md mx-auto mb-12">
          <WaitlistForm />
        </div>

        {/* Countdown Timer */}
        <div className="text-xl font-semibold text-gray-800 mb-12">
          Launching in:
          <div className="text-2xl font-mono mt-2">
            {`${timeLeft.months}mo ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
          </div>
        </div>

        {/* Features Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Key Features</h2>
          <ul className="space-y-4 text-left mx-auto max-w-2xl">
            <li><strong>🧠 Legal Research:</strong> Get accurate, AI-assisted legal research in seconds.</li>
            <li><strong>📝 Case Summarization:</strong> Upload documents and receive clear, concise summaries instantly.</li>
            <li><strong>📄 Contract Review:</strong> Highlight risk clauses, extract key terms, and auto-generate summaries.</li>
            <li><strong>🤖 Smart Assistant:</strong> Ask questions about legal topics and get guided answers.</li>
          </ul>
        </section>

        {/* Roadmap Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold mb-6">Roadmap</h2>
          <ul className="space-y-4 text-left mx-auto max-w-2xl">
            <li><strong>🔒 April 2025:</strong> Secure waitlist opens for early adopters.</li>
            <li><strong>🧪 May 2025:</strong> Beta access begins for legal research and summarization tools.</li>
            <li><strong>📑 June 2025:</strong> Launch of contract analyzer and auto-summary engine.</li>
            <li><strong>⚖️ July 2025:</strong> Guided AI legal assistant for client Q&A scenarios.</li>
            <li><strong>🌐 August 2025:</strong> Expansion to immigration, family, and business law domains.</li>
            <li><strong>🚀 October 1, 2025:</strong> Full public launch with integrated billing and support.</li>
          </ul>
        </section>

        {/* FAQ Section */}
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

        <footer className="text-center text-sm text-gray-400 py-10">
          VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
        </footer>
      </main>
    </div>
  );
}
