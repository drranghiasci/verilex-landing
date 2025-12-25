import Head from 'next/head';
import Link from 'next/link';

export default function MyClientHome() {
  return (
    <>
      <Head>
        <title>MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-6 py-20 text-[color:var(--text-1)]">
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.35em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">MyClient</h1>
          <p className="mt-4 text-[color:var(--text-2)]">
            Secure client portal for firms using VeriLex AI.
          </p>
          <Link
            href="/myclient/app"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white hover:bg-[color:var(--accent)] transition"
          >
            Open App
          </Link>
        </div>
      </div>
    </>
  );
}
