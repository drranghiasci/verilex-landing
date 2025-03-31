import Head from 'next/head';
import WaitlistForm from '../components/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 space-y-16">
      <Head>
        <title>VeriLex AI – Join the Waitlist</title>
      </Head>

      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold">Your AI-Powered Legal Assistant</h1>
        <p className="text-lg">
          Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
        </p>
        <WaitlistForm />
      </section>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 pt-12 border-t">
        VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
      </footer>
    </div>
  );
}
