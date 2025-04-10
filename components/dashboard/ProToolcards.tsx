'use client';

import React from 'react';
import { Tooltip } from 'react-tooltip';
import { CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';

type Tool = {
  name: string;
  description: string;
  icon: string;
  available: boolean;
};

const tools: Tool[] = [
  {
    name: 'Legal Research',
    description: 'Get case law and statute summaries in seconds.',
    icon: '📚',
    available: true,
  },
  {
    name: 'Case Summarization',
    description: 'Upload files and receive detailed, accurate summaries.',
    icon: '📝',
    available: true,
  },
  {
    name: 'Contract Analyzer',
    description: 'Extract risk clauses and key provisions instantly.',
    icon: '📄',
    available: true,
  },
  {
    name: 'AI Legal Assistant',
    description: 'Ask legal questions and get guided answers.',
    icon: '🤖',
    available: true,
  },
  {
    name: 'Smart Intake Bot',
    description: 'Collect client details with automated logic.',
    icon: '🧠',
    available: true,
  },
  {
    name: 'Timeline Generator',
    description: 'Auto-generate legal timelines from case files.',
    icon: '🕒',
    available: true,
  },
];

export default function ProToolcards() {
  return (
    <div className="bg-white p-6 shadow rounded-xl">
      <h2 className="text-xl font-bold mb-6 text-black">🚀 Pro-Tier AI Tools</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <div
            key={index}
            className={`relative bg-gradient-to-br from-slate-50 to-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition`}
          >
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-3xl">{tool.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{tool.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{tool.description}</p>
            {tool.available ? (
              <CheckCircleIcon className="w-5 h-5 text-green-500 absolute top-4 right-4" />
            ) : (
              <LockClosedIcon className="w-5 h-5 text-gray-400 absolute top-4 right-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
