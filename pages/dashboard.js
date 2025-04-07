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
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <Link href="/" className="text-sm text-black underline">&larr; Back to The VeriLex Webpage</Link>
          <Image src="/verilex-logo-name.png" alt="VeriLex AI Logo" width={150} height={60} />
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">(Lawyer’s/Paralegal’s Name)’s Dashboard</h1>
        <p className="text-center text-xl font-semibold mb-8">Welcome, Goodmorning!<br />Today is Monday April 7th 2025</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-y border-gray-300 py-8 mb-10">
          <div>
            <h2 className="text-xl font-bold mb-2">To Do List:</h2>
            <p className="font-semibold mt-4">Today:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Client check-in with Smith</li>
              <li>Review evidence from Lopez</li>
            </ul>
            <p className="font-semibold">This Week:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Draft motion for Johnson case</li>
              <li>Send follow-up to Williams</li>
            </ul>
            <p className="font-semibold">This Month:</p>
            <p className="text-gray-500 italic">add/edit</p>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Upcoming Events:</h2>
            <p className="font-semibold mt-4">Today:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Consult: Maria Lopez @ 1:30 PM</li>
            </ul>
            <p className="font-semibold">This Week:</p>
            <ul className="list-disc list-inside text-gray-700 mb-4">
              <li>Court Hearing: Johnson v. Johnson (in 2 days)</li>
            </ul>
            <p className="font-semibold">This Month:</p>
            <p className="text-gray-500 italic">add/edit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 shadow rounded-xl">
            <h3 className="font-bold text-lg mb-2">📂 Open Cases</h3>
            <p className="text-2xl font-bold">14</p>
          </div>
          <div className="bg-white p-6 shadow rounded-xl">
            <h3 className="font-bold text-lg mb-2">💬 Unread Messages</h3>
            <p className="text-2xl font-bold">5</p>
          </div>
          <div className="bg-white p-6 shadow rounded-xl">
            <h3 className="font-bold text-lg mb-2">🕒 Filings Due</h3>
            <p className="text-2xl font-bold">2 this week</p>
          </div>
        </div>

        <div className="bg-white p-6 shadow rounded-xl mb-12">
          <h2 className="text-xl font-bold mb-4">📥 Latest Client Activity</h2>
          <ul className="space-y-2 text-gray-700">
            <li><strong>Lopez</strong> submitted a financial affidavit (3 hrs ago)</li>
            <li><strong>Johnson</strong> uploaded supporting evidence (Yesterday)</li>
            <li><strong>Williams</strong> signed the retainer agreement</li>
          </ul>
        </div>

        <div className="bg-white p-6 shadow rounded-xl mb-12">
          <h2 className="text-xl font-bold mb-4">✅ Open Follow-Ups</h2>
          <ul className="space-y-2 text-gray-700">
            <li>Submit draft filing for Johnson case</li>
            <li>Client call: Williams (reschedule)</li>
            <li>Pending doc review: Lopez</li>
          </ul>
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
