import Head from 'next/head';

export default function MyClientApp() {
  return (
    <>
      <Head>
        <title>VeriLex MyClient</title>
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--accent-soft)]">MyClient</p>
          <h1 className="mt-4 text-4xl font-bold text-white">You&apos;re signed in.</h1>
          <p className="mt-4 text-[color:var(--text-2)]">
            Your personalized dashboard is on the way. For now, you can verify that access has been provisioned successfully.
          </p>
        </div>
      </div>
    </>
  );
}
