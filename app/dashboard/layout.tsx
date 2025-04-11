'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Fetch the session from Supabase
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;

      if (error) {
        console.error('Supabase session error:', error);
      }

      if (!data?.session) {
        // If no session, redirect to the login page
        router.push('/login');
      } else {
        // If a session exists, store it locally
        setSession(data.session);
      }
      setLoading(false);
    });

    // Cleanup to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking session...
      </div>
    );
  }

  // If session is missing, we've already redirected. 
  // But in case the redirect was slow:
  if (!session) return null;

  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen flex">
      <QuickAccessSidebar />
      <main className="p-4 md:p-8 flex-1">{children}</main>
    </div>
  );
}
