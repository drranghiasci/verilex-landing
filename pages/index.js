import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  // Calculate 6 months from now
  const now = new Date();
  const sixMonthsFromNow = new Date(now.setMonth(now.getMonth() + 6)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Logo fixed in top-left */}
      <header className="fixed top-4 left-4 z-50">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={240}
          height={80}
          priority
        />
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-6 py-32 pl-[270px]">
        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
          Your AI-Powered Legal Assistant
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>

        <div className="w-full max-w-md">
          <WaitlistForm />
        </div>

        <section className="mt-20">
          <h2 className="text-2xl font-bold mb-4">6-Month Countdown</h2>
          <p className="text-gray-600">We’re launching full platform access on <strong>{sixMonthsFromNow}</strong>. Join the waitlist to get early access.</p>
        </section>
      </main>

      {/* Features Section */}
      <section className="px-6 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Core Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg shadow bg-white">
              <h3 className="font-semibold text-lg mb-2">AI Legal Research</h3>
              <p className="text-gray-600">Get case law, statutes, and legal opinions summarized instantly.</p>
            </div>
            <div className="p-6 rounded-lg shadow bg-white">
              <h3 className="font-semibold text-lg mb-2">Contract Review</h3>
              <p className="text-gray-600">Analyze contracts for risks, clauses, and obligations using AI.</p>
            </div>
            <div className="p-6 rounded-lg shadow bg-white">
              <h3 className="font-semibold text-lg mb-2">Smart Intake Bots</h3>
              <p className="text-gray-600">Streamline client onboarding with AI-driven intake forms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">What’s Coming Next</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">Q2 2025: Early Access</h3>
              <p className="text-gray-600">Beta program with solo lawyers testing core tools.</p>
            </li>
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">Q3 2025: Automation Suite</h3>
              <p className="text-gray-600">Launch of form generators, calendaring, and client portal tools.</p>
            </li>
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">Q4 2025: Subscription Model</h3>
              <p className="text-gray-600">Monthly pricing tiers for solo, boutique, and small firm users.</p>
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-20 bg-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold">Is VeriLex AI a law firm?</h3>
              <p className="text-gray-600">No. VeriLex AI is a software platform and does not provide legal advice.</p>
            </div>
            <div>
              <h3 className="font-semibold">When will I get access?</h3>
              <p className="text-gray-600">Early access begins in Q2 2025. Join the waitlist for updates.</p>
            </div>
            <div>
              <h3 className="font-semibold">How much will it cost?</h3>
              <p className="text-gray-600">We’ll offer affordable monthly plans depending on firm size.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-400 py-10">
        VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
      </footer>
    </div>
  );
}
