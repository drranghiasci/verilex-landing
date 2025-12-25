import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-6">
      <h2 className="text-xl font-bold mb-8">VeriLex AI</h2>
      <nav className="space-y-4">
        <Link href="/dashboard" className="block text-gray-800 hover:font-semibold">
          Dashboard
        </Link>
        <Link href="/new-case" className="block text-gray-800 hover:font-semibold">
          New Case
        </Link>
        <Link href="/settings" className="block text-gray-800 hover:font-semibold">
          Settings
        </Link>
      </nav>
    </aside>
  );
}
