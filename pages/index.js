import Head from 'next/head'
import Image from 'next/image'
import { useState } from 'react'

export default function Home() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
    } else {
      setMessage('You’ve been added to the waitlist! Check your email 📩')
      setName('')
      setEmail('')
    }

    setLoading(false)
  }

  return (
    <>
      <Head>
        <title>VeriLex AI</title>
        <meta name="description" content="AI-Powered Legal Assistant for Solo Attorneys and Small Firms" />
        <link rel="icon" href="/verilex-logo-name.png" />
      </Head>

      <main className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white overflow-hidden">
        {/* Glow background */}
        <div className="absolute -top-32 left-1/2 w-[72rem] h-[72rem] bg-[#00d4ff1a] rounded-full blur-[180px] opacity-40 -translate-x-1/2" />

        <div className="z-10 relative flex flex-col items-center justify-center px-6 pt-28 pb-16 text-center max-w-2xl mx-auto">
          <Image
            src="/verilex-logo-name.png"
            alt="VeriLex AI Logo"
            width={180}
            height={50}
            className="mb-6"
          />

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Your AI-Powered Legal Assistant
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-gray-300">
            Automate legal research, summarize cases, and review contracts — built for solo attorneys and small firms.
          </p>

          <form onSubmit={handleSubmit} className="mt-10 w-full max-w-md space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-medium rounded-lg bg-cyan-500 hover:bg-cyan-600 transition duration-300 disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Waitlist'}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {message && <p className="text-green-400 text-sm mt-2">{message}</p>}
          </form>
        </div>

        <section className="z-10 relative px-6 pt-12 pb-24 bg-gray-900 bg-opacity-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">What’s Coming Soon</h2>
            <ul className="space-y-3 text-gray-300 text-left">
              <li>✅ Natural language legal research</li>
              <li>✅ Case summarization & precedent finding</li>
              <li>✅ AI-generated contracts & clause suggestions</li>
              <li>✅ Secure client intake & document management</li>
              <li>✅ Email summaries of recent legal news and rulings</li>
            </ul>
          </div>
        </section>

        <footer className="text-center text-sm text-gray-500 pb-6">
          VeriLex AI is not a law firm and does not provide legal advice. All information is for informational purposes only.
        </footer>
      </main>
    </>
  )
}
