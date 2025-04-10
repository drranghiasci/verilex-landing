'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking session...
      </div>
    );
  }

  if (!session) {
    // no session, already redirecting
    return null;
  }

  // Now just your side nav, maybe a top nav if you want
  return (
    <div className={darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}>
      {/* If you do want a top nav, place it here. Otherwise remove */}
      {/* <header>
        <button onClick={() => setDarkMode(!darkMode)}>Toggle Dark Mode</button>
      </header> */}

      <div className="min-h-screen flex">
        <QuickAccessSidebar />
        <main className="ml-16 md:ml-64 p-4 md:p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
