'use client';

import { Analytics } from "@vercel/analytics/react";
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const PASSWORD = 'verilex2025'; // Set your desired password here

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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Image
            src="/verilex-logo-name.png"
            alt="VeriLex AI Logo"
            width={140}
            height={50}
            className="object-contain"
            priority
          />
        </div>
        <div className="space-x-6 text-sm font-medium">
          <Link href="/">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Home</span>
          </Link>
          <Link href="/new-case">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">New Case</span>
          </Link>
          <Link href="/active-cases">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Active Cases</span>
          </Link>
          <Link href="/settings">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Content Padding */}
      <div className="pt-28 px-8 max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-6">Dashboard</h1>
        <p className="text-lg text-gray-700 mb-10 max-w-2xl">
          Welcome to the VeriLex AI Beta Dashboard. Here you can manage cases, launch research tools, and customize settings.
        </p>

        {/* Dashboard Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
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
    </div>
  );
}
