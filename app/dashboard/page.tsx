'use client';

import TodaySnapshot from '@/components/dashboard/TodaySnapshot';
import TaskEngine from '@/components/dashboard/TaskEngine';
import ClientPortalNotifications from '@/components/dashboard/ClientPortalNotifications';
import SmartCaseFeed from '@/components/dashboard/SmartCaseFeed';
import ProToolcards from '@/components/dashboard/ProToolcards';
import BillingOverview from '@/components/dashboard/BillingOverview';

export default function DashboardPage() {
  return (
    <div className="min-h-screen px-6 py-6">
      {/* 
        3 rows × 2 columns on md+ screens 
        For smaller screens, it’s 1 column stacked 
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Row 1, Col 1 */}
        <div className="bg-white shadow rounded-xl p-6">
          <TodaySnapshot />
        </div>

        {/* Row 1, Col 2 */}
        <div className="bg-white shadow rounded-xl p-6">
          <TaskEngine />
        </div>

        {/* Row 2, Col 1 */}
        <div className="bg-white shadow rounded-xl p-6">
          <ClientPortalNotifications />
        </div>

        {/* Row 2, Col 2 */}
        <div className="bg-white shadow rounded-xl p-6">
          <SmartCaseFeed />
        </div>

        {/* Row 3, Col 1 */}
        <div className="bg-white shadow rounded-xl p-6">
          <ProToolcards />
        </div>

        {/* Row 3, Col 2 */}
        <div className="bg-white shadow rounded-xl p-6">
          <BillingOverview />
        </div>
      </div>
    </div>
  );
}
