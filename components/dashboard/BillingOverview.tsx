'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function BillingOverview() {
  // Sample billing and usage data (replace with real props or API call)
  const plan = 'Free'; // or 'Pro'
  const balance = '$0.00';
  const invoiceDate = 'Apr 5, 2025';
  const lastPayment = 'Mar 5, 2025';
  const usage = {
    cases: 12,
    documents: 32,
    storage: '1.8 GB',
    aiUsage: '45 prompts',
  };

  const isFree = plan === 'Free';

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">💳 Billing Overview</h2>
        <span
          className={`text-sm font-medium px-3 py-1 rounded-full ${
            isFree ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {plan} Plan
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Current Balance</h3>
          <p className="text-2xl font-bold text-gray-900">{balance}</p>
        </div>
        <div>
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Last Invoice Date</h3>
          <p className="text-lg font-medium text-gray-800">{invoiceDate}</p>
        </div>
        <div>
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Last Payment</h3>
          <p className="text-lg font-medium text-gray-800">{lastPayment}</p>
        </div>
        <div>
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Billing Options</h3>
          <div className="space-y-2">
            <Link href="/settings/billing" className="text-sm text-blue-600 hover:underline">
              View Billing History
            </Link>
            <br />
            <Link href="/settings/payment" className="text-sm text-blue-600 hover:underline">
              Update Payment Method
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Usage This Month</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>📁 Cases Managed: <strong>{usage.cases}</strong></li>
          <li>📄 Documents Uploaded: <strong>{usage.documents}</strong></li>
          <li>🧠 AI Tool Prompts Used: <strong>{usage.aiUsage}</strong></li>
          <li>💾 Storage Used: <strong>{usage.storage}</strong></li>
        </ul>
      </div>

      {isFree && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center text-yellow-700 text-sm space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span>You’re currently on the Free plan. Upgrade to unlock full features.</span>
          </div>
          <Link
            href="/upgrade"
            className="mt-3 inline-block bg-black text-white px-4 py-2 text-sm rounded-md hover:bg-gray-800 transition"
          >
            Upgrade to Pro
          </Link>
        </div>
      )}
    </div>
  );
}
