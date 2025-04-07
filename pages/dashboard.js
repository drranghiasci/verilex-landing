"use client";

import { Analytics } from "@vercel/analytics/react";
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
      <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 flex flex-col items-center justify-center px-4">
        <Image
          src="/verilex-logo-name.png"
          alt="VeriLex AI Logo"
          width={200}
          height={80}
          className="mb-6"
        />
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-gray-200">
          <h2 className="text-2xl font-extrabold mb-4 text-center">Enter Beta Access Password</h2>
          <input
            type="password"
            value={enteredPassword}
            onChange={(e) => setEnteredPassword(e.target.value)}
            placeholder="Password"
            className="w-full border border-gray-300 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-black"
          />
          {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-4">(Law Firm’s Name)’s Dashboard</h1>
        <p className="text-center text-lg font-medium mb-10">Welcome, Good morning. It is Monday, April 7th</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="text-xl font-semibold mb-3">To Do List:</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Follow up with client intake forms</li>
              <li>Prepare filing for Jones v. Jones</li>
              <li>Review uploaded documents</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Upcoming Events:</h2>
            <ul className="space-y-3 text-gray-700">
              <li><strong>10:00 AM:</strong> Mediation - Smith v. Smith</li>
              <li><strong>1:30 PM:</strong> Zoom Consult - Maria Lopez</li>
              <li><strong>4:00 PM:</strong> Filing Deadline - County Court</li>
            </ul>
          </div>
        </div>

        <div className="bg-black text-white p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Feature Tiles</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/new-case">
              <div className="bg-white text-black p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <h3 className="text-xl font-semibold mb-2">+ New Case</h3>
                <p className="text-gray-600">Start a new intake with client and case details.</p>
              </div>
            </Link>

            <Link href="/active-cases">
              <div className="bg-white text-black p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <h3 className="text-xl font-semibold mb-2">📁 Active Cases</h3>
                <p className="text-gray-600">View and manage your open case files and submissions.</p>
              </div>
            </Link>

            <Link href="/settings">
              <div className="bg-white text-black p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
                <h3 className="text-xl font-semibold mb-2">⚙️ Settings</h3>
                <p className="text-gray-600">Manage user preferences and account configuration.</p>
              </div>
            </Link>

            <div className="bg-white text-black p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
              <h3 className="text-xl font-semibold mb-2">🔒 AI Legal Assistant</h3>
              <p className="text-gray-600">Coming Soon: Ask legal questions, summarize cases, and more.</p>
            </div>

            <div className="bg-white text-black p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
              <h3 className="text-xl font-semibold mb-2">📊 Analytics</h3>
              <p className="text-gray-600">Track case stats, filings, and client activity (Coming Soon).</p>
            </div>

            <div className="bg-white text-black p-6 rounded-lg shadow opacity-50 cursor-not-allowed">
              <h3 className="text-xl font-semibold mb-2">📁 Document Generator</h3>
              <p className="text-gray-600">Generate legal filings from intake data (Coming Soon).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
