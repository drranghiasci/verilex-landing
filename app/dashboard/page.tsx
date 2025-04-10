'use client';

import TodaySnapshot from '@/components/dashboard/TodaySnapshot';
import TaskEngine from '@/components/dashboard/TaskEngine';
import ClientPortalNotifications from '@/components/dashboard/ClientPortalNotifications';
import SmartCaseFeed from '@/components/dashboard/SmartCaseFeed';
import ProToolcards from '@/components/dashboard/ProToolcards';
import BillingOverview from '@/components/dashboard/BillingOverview';

export default function DashboardPage() {
  return (
    <div className="p-6 min-h-screen">
      {/* 
        A single grid with 6 modules, each in its own card. 
        On md+ screens, we have 3 columns, so 2 rows total. 
      */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1st Row of Modules */}
        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <TodaySnapshot />
        </div>

        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <TaskEngine />
        </div>

        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <ClientPortalNotifications />
        </div>

        {/* 2nd Row of Modules */}
        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <SmartCaseFeed />
        </div>

        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <ProToolcards />
        </div>

        <div className="bg-white shadow rounded-xl p-4 flex flex-col justify-center">
          <BillingOverview />
        </div>
      </div>
    </div>
  );
}
