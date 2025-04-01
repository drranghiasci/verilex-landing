import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and a valid email.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setMessage("You're on the waitlist! We'll be in touch soon.");
        setName("");
        setEmail("");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-16 flex flex-col items-center justify-center font-sans">
      <div className="flex items-center mb-8">
        <Image
          src="/verilex-logo.png"
          alt="VeriLex AI Logo"
          width={48}
          height={48}
        />
        <h1 className="text-4xl font-bold ml-4 tracking-tight">VeriLex AI</h1>
      </div>

      <h2 className="text-xl md:text-2xl text-center max-w-2xl mb-6 text-gray-300">
        Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
      </h2>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-4 text-black"
      >
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors duration-300"
        >
          {loading ? "Joining..." : "Join Waitlist"}
        </button>
        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
      </form>

      <p className="mt-10 text-xs text-gray-500 text-center max-w-md">
        VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only. As an early subscriber, you'll receive priority access to beta features and product updates.
      </p>
    </main>
  );
}
