import Image from "next/image";
import Head from "next/head";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
    } else {
      setSuccess(true);
      setName("");
      setEmail("");
    }
  };

  return (
    <>
      <Head>
        <title>VeriLex AI — Join the Waitlist</title>
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center px-4 bg-gradient-to-b from-white via-slate-100 to-slate-200 text-slate-800">
        <div className="absolute top-4 left-4">
          <Image
            src="/verilex-logo-name.png"
            alt="VeriLex AI Logo"
            width={160}
            height={40}
            priority
          />
        </div>
        <div className="max-w-xl w-full text-center z-10 p-6 rounded-2xl shadow-xl bg-white/60 backdrop-blur-md">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">
            Your AI-Powered Legal Assistant
          </h1>
          <p className="text-lg mb-6">
            Automate legal research, summarize cases, and review contracts —
            built for solo attorneys and small firms.
          </p>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 items-center"
          >
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-lg border border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <button
              type="submit"
              className="w-full max-w-md px-4 py-3 mt-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all"
            >
              Join Waitlist
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            {success && (
              <p className="text-green-600 text-sm">
                Success! You've been added to the waitlist.
              </p>
            )}
          </form>
        </div>
        <footer className="text-sm text-center mt-10 text-slate-600 px-4">
          VeriLex AI is not a law firm and does not provide legal advice. All
          information is for informational purposes only.
        </footer>
      </main>
    </>
  );
}
