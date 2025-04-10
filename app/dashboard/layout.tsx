'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data?.session) {
        router.push('/login');
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null; // redirected to /login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 relative">
      {/* Left Sidebar */}
      <QuickAccessSidebar />

      {/* Main content with sidebar offset */}
      <main className="ml-16 md:ml-64 p-6">{children}</main>
    </div>
  );
}
