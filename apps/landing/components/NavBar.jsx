// components/NavBar.jsx

import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/">
          <span className="text-xl font-semibold tracking-tight text-black">VeriLex AI</span>
        </Link>
        <div className="space-x-4 text-sm">
          <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <Link href="/new-case" className="hover:text-blue-600">New Case</Link>
          <Link href="/settings" className="hover:text-blue-600">Settings</Link>
        </div>
      </div>
    </nav>
  );
}
