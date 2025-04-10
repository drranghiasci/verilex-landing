// components/TodaySnapshot.tsx
'use client';

import React from 'react';

export default function TodaySnapshot() {
  // Static example data – you can replace with live Supabase queries later
  const snapshotData = {
    newClients: 2,
    filingsDue: 3,
    upcomingEvents: 1,
    unreadMessages: 5,
  };

  return (
    <div className="bg-white shadow-md border border-gray-200 rounded-xl p-6 mb-10">
      <h2 className="text-xl font-bold mb-4 text-gray-900">📆 Today’s Snapshot</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-gray-800">
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.newClients}</p>
          <p className="text-sm text-gray-600">New Clients</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.filingsDue}</p>
          <p className="text-sm text-gray-600">Filings Due</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.upcomingEvents}</p>
          <p className="text-sm text-gray-600">Events Today</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold">{snapshotData.unreadMessages}</p>
          <p className="text-sm text-gray-600">Unread Messages</p>
        </div>
      </div>
    </div>
  );
}
