'use client';

import TodaySnapshot from '@/components/dashboard/TodaySnapshot';
import TaskEngine from '@/components/dashboard/TaskEngine';
import ClientPortalNotifications from '@/components/dashboard/ClientPortalNotifications';
import SmartCaseFeed from '@/components/dashboard/SmartCaseFeed';
import ProToolcards from '@/components/dashboard/ProToolcards';
import BillingOverview from '@/components/dashboard/BillingOverview';

export default function DashboardPage() {
  return (
    <div className="min-h-screen px-6 py-6 bg-white dark:bg-zinc-950 transition-colors duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <TodaySnapshot />
        <TaskEngine />
        <ClientPortalNotifications />
        <SmartCaseFeed />
        <ProToolcards />
        <BillingOverview />
      </div>
    </div>
  );
}
