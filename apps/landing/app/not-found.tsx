// app/not-found.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/verilex-logo-name-lightmode.png"
        alt="VeriLex AI"
        width={200}
        height={70}
        priority
        className="mb-6"
      />

      <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
        404&nbsp;— Page Not Found
      </h1>
      <p className="text-lg text-gray-700 max-w-md mb-8">
        The page you’re looking for doesn’t exist or has been moved. Let’s get
        you back to work.
      </p>

      <Link
        href="/"
        className="inline-block bg-black text-white px-6 py-3 rounded-md hover:opacity-90 transition"
      >
        Return Home
      </Link>
    </main>
  );
}
