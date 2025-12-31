// app/not-found.tsx
'use client';

import Link from 'next/link';
import VerilexLogo from '@/components/dashboard/VerilexLogo';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 flex flex-col items-center justify-center px-4 text-center">
      <VerilexLogo className="mb-6 w-[200px] h-auto" />

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
