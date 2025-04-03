'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewCasePage() {
  const [clientName, setClientName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder for submission logic
    console.log({ clientName, caseType, location });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 px-6 py-10">
        <h2 className="text-2xl font-extrabold mb-8 text-gray-800">VeriLex AI</h2>
        <nav className="flex flex-col space-y-4">
          <Link href="/dashboard">
            <span className="text-blue-600 hover:underline">Dashboard</span>
          </Link>
          <Link href="/new-case">
            <span className="text-blue-600 hover:underline">New Case</span>
          </Link>
          <Link href="/settings">
            <span className="text-blue-600 hover:underline">Settings</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-10 py-12">
        <h1 className="text-4xl font-bold mb-8">New Divorce Intake</h1>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="clientName">
              Client Name
            </label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g., Jane Doe"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="caseType">
              Case Type
            </label>
            <select
              id="caseType"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select one</option>
              <option value="uncontested">Uncontested Divorce</option>
              <option value="contested">Contested Divorce</option>
              <option value="custody">Child Custody</option>
              <option value="support">Spousal Support</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1" htmlFor="location">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Georgia"
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-800 transition"
          >
            Submit Case
          </button>
        </form>
      </main>
    </div>
  );
}
