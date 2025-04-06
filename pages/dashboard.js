'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PASSWORD = 'verilex2025';

export default function DashboardPage() {
  const [enteredPassword, setEnteredPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (enteredPassword === PASSWORD) {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-4 text-center">Enter Beta Access Password</h2>
          <input
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-300 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-black"
          />
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 pt-20">
      <div className="flex justify-center mb-10">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={300}
          height={80}
          priority
        />
      </div>

      <h1 className="text-4xl font-extrabold mb-6 text-center">Dashboard</h1>
      <p className="text-lg text-gray-700 mb-10 text-center max-w-2xl mx-auto">
        Welcome to the VeriLex AI Beta Dashboard. Use the tools below to manage new cases, view activity, and customize your experience.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
        <Link href="/new-case">
          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">+ New Case</h2>
            <p className="text-gray-600">Start a new intake with client and case details.</p>
          </div>
        </Link>

        <Link href="/active-cases">
          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">📁 Active Cases</h2>
            <p className="text-gray-600">View and manage your open case files and submissions.</p>
          </div>
        </Link>

        <Link href="/settings">
          <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">⚙️ Settings</h2>
            <p className="text-gray-600">Manage user preferences and account configuration.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
