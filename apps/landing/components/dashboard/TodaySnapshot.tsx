// components/TodaySnapshot.tsx
'use client';

import React from 'react';

export default function TodaySnapshot() {
  const snapshotData = {
    newClients: 2,
    filingsDue: 3,
    upcomingEvents: 1,
    unreadMessages: 5,
  };

  return (
    <div className="bg-white dark:bg-zinc-900 shadow-md border border-gray-200 dark:border-zinc-700 rounded-xl p-6 mb-10 transition-colors duration-300">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📆 Today’s Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-800 dark:text-white">
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.newClients}</p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">New Clients</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.filingsDue}</p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Filings Due</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.upcomingEvents}</p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Events Today</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.unreadMessages}</p>
          <p className="text-sm text-gray-600 dark:text-zinc-400">Unread Messages</p>
        </div>
      </div>
    </div>
  );
}
