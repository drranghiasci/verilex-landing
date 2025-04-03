'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function NewCase() {
  const [clientName, setClientName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ clientName, caseType, location });
  };

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
          <Link href="/" className="text-gray-700 hover:text-black transition">Home</Link>
          <Link href="/dashboard" className="text-gray-700 hover:text-black transition">Dashboard</Link>
          <Link href="/settings" className="text-gray-700 hover:text-black transition">Settings</Link>
        </div>
      </nav>

      {/* Form */}
      <main className="pt-32 px-6 max-w-3xl mx-auto text-center">
        <h1 className="text-3xl font-extrabold mb-2">New Divorce Intake</h1>
        <p className="text-gray-600 mb-8">Fill in the intake form below to begin a new case.</p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-white p-8 rounded-xl shadow-md text-left"
        >
          <div>
            <label className="block mb-1 font-medium">Client Name</label>
            <input
              type="text"
              placeholder="e.g., Jane Doe"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Case Type</label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
            >
              <option value="">Select one</option>
              <option value="contested">Contested Divorce</option>
              <option value="uncontested">Uncontested Divorce</option>
              <option value="modification">Modification</option>
              <option value="custody">Custody Dispute</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-medium">Location</label>
            <input
              type="text"
              placeholder="e.g., Georgia"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-md hover:bg-gray-900 transition"
          >
            Submit Case
          </button>
        </form>
      </main>
    </div>
  );
}
