"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import TodaySnapshot from '@/components/dashboard/TodaySnapshot';
import TaskEngine from '@/components/dashboard/TaskEngine';
import SmartCaseFeed from '@/components/dashboard/SmartCaseFeed';
import ClientPortalNotifications from '@/components/dashboard/ClientPortalNotifications';
import ProToolcards from '@/components/dashboard/ProToolcards';
import BillingOverview from '@/components/dashboard/BillingOverview';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();
      console.log("Session:", data.session);
      if (!data.session) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    }
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {/* Top Row: Snapshot + Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TodaySnapshot />
        <TaskEngine />
      </div>

      {/* Middle Row: Notifications + Case Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ClientPortalNotifications />
        <SmartCaseFeed />
      </div>

      {/* Bottom Row: AI Tools + Billing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <ProToolcards />
        <BillingOverview />
      </div>
    </>
  );
}
