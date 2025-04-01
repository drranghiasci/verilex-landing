import Image from 'next/image';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Logo in top-left */}
      <header className="absolute top-4 left-4">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={180}
          height={60}
          priority
        />
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center text-center px-6 py-32">
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

      {/* Roadmap Section */}
      <section className="px-6 py-20 bg-white animate-slide-up">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">What&apos;s Coming Next</h2>
          <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">Early Access Beta</h3>
              <p className="text-gray-600">Start testing VeriLex AI&apos;s research and summarization tools before public release.</p>
            </li>
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">Contract Analyzer</h3>
              <p className="text-gray-600">Upload a contract and get instant risk flags, key terms, and plain-language summaries.</p>
            </li>
            <li className="p-6 bg-gray-50 rounded-xl shadow-md hover:shadow-xl transition">
              <h3 className="font-semibold text-lg mb-2">AI Legal Assistant</h3>
              <p className="text-gray-600">Ask case-specific questions and get guided responses using smart prompts.</p>
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
