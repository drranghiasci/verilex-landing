import Head from 'next/head';
import Image from 'next/image';
import WaitlistForm from '@/components/WaitlistForm';
import logo from '@/public/verilex-logo-name.png'; // Make sure this file exists in /public

export default function Home() {
  return (
    <>
      <Head>
        <title>VeriLex AI — Your AI-Powered Legal Assistant</title>
        <meta name="description" content="Join the waitlist for VeriLex AI, the AI-powered legal research and document review assistant for solo attorneys and small law firms." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-gray-950 to-neutral-900 text-white">
        <div className="w-full max-w-xl space-y-8">
          <div className="flex justify-center">
            <Image 
              src={logo} 
              alt="VeriLex AI Logo" 
              width={300} 
              height={80} 
              priority 
            />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Your AI-Powered Legal Assistant
          </h1>
          <p className="text-center text-lg text-gray-300">
            Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
          </p>

          <WaitlistForm />

          <div className="mt-6 text-sm text-center text-gray-500 border-t border-gray-800 pt-4">
            VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
          </div>
        </div>
      </main>
    </>
  );
}
