import Head from 'next/head';
import Link from 'next/link';

export default function MyClientLogin() {
  return (
    <>
      <Head>
        <title>VeriLex AI | MyClient Portal</title>
        <meta name="description" content="Secure client experience portal for VeriLex-powered family law firms." />
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">VeriLex MyClient</p>
            <h1 className="mt-3 text-3xl font-bold text-white">MyClient portal login (beta)</h1>
            <p className="mt-3 text-sm text-[color:var(--text-2)]">
              Access is provisioned after your firm&apos;s intake approval to keep portals secure.
            </p>
          </div>

          <form className="mt-10 space-y-6">
            <div>
              <label className="block text-sm font-medium text-white">Email</label>
              <input
                type="email"
                className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder="client@yourfirm.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Password</label>
              <input
                type="password"
                className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="button"
              className="w-full rounded-lg bg-[color:var(--accent-light)] px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[color:var(--accent)]"
            >
              Continue
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-[color:var(--text-2)]">
            Need access?{' '}
            <Link href="https://verilex.us/firm-intake" className="text-[color:var(--accent-soft)] hover:text-white transition">
              Submit firm intake
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
