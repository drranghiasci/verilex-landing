import TodaySnapshot from '@/components/dashboard/TodaySnapshot';
import TaskEngine from '@/components/dashboard/TaskEngine';
import SmartCaseFeed from '@/components/dashboard/SmartCaseFeed';
import ClientPortalNotifications from '@/components/dashboard/ClientPortalNotifications';
import ProToolcards from '@/components/dashboard/ProToolcards';
import BillingOverview from '@/components/dashboard/BillingOverview';

export default function DashboardPage() {
  return (
    <>
      {/* Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TodaySnapshot />
        <TaskEngine />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ClientPortalNotifications />
        <SmartCaseFeed />
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProToolcards />
        <BillingOverview />
      </div>
    </>
  );
}
