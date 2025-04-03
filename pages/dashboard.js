'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900">
      {/* Top Nav */}
      <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50 py-3 px-6 flex justify-between items-center">
        <div className="text-xl font-extrabold tracking-tight text-gray-900">VeriLex AI</div>
        <div className="space-x-6 text-sm font-medium">
          <Link href="/">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Home</span>
          </Link>
          <Link href="/new-case">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">New Case</span>
          </Link>
          <Link href="/settings">
            <span className="text-gray-700 hover:text-black transition cursor-pointer">Settings</span>
          </Link>
        </div>
      </nav>

      {/* Content Padding */}
      <div className="pt-20 px-8">
        <h1 className="text-4xl font-extrabold mb-6">Dashboard</h1>
        <p className="text-lg text-gray-700 mb-8 max-w-2xl">
          Welcome to the VeriLex AI Beta Dashboard. Here you can manage cases, launch research tools, and customize settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/new-case">
            <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
              <h2 className="text-xl font-semibold mb-2">+ New Case</h2>
              <p className="text-gray-600">Start a new intake with client and case details.</p>
            </div>
          </Link>

          <Link href="/settings">
            <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
              <h2 className="text-xl font-semibold mb-2">⚙️ Settings</h2>
              <p className="text-gray-600">Manage user preferences and account configuration.</p>
            </div>
          </Link>

          <Link href="#">
            <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer">
              <h2 className="text-xl font-semibold mb-2">📊 Case History</h2>
              <p className="text-gray-600">(Coming soon) View summaries and client history.</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
