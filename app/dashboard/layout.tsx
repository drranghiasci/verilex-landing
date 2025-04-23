'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';
import TopMenu from '@/components/dashboard/TopMenu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [session, setSession] = useState<any | undefined>(undefined); // undefined = still loading
  const [loading, setLoading] = useState(true);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data?.session) {
        console.error('Auth error or no session:', error);
        if (isMounted) {
          setSession(null);
          setRedirectPath('/login');
          setLoading(false);
        }
        return;
      }

      const userId = data.session.user.id;
      if (isMounted) setSession(data.session);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('beta_access')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Failed to fetch profile:', profileError);
        if (isMounted) {
          setRedirectPath('/register');
          setLoading(false);
        }
        return;
      }

      if (!profile || !profile.beta_access) {
        console.warn('User lacks beta access or profile missing');
        if (isMounted) {
          setRedirectPath('/request-access');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(false); // ✅ All checks passed
      }
    };

    checkAccess();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => checkAccess(), 250);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  useEffect(() => {
    if (!loading && redirectPath !== null && session !== undefined) {
      router.replace(redirectPath);
    }
  }, [loading, redirectPath, session, router]);

  if (loading || session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-950 transition-colors">
        Checking access&hellip;
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white transition-colors">
      <TopMenu />
      <div className="flex min-h-screen">
        <QuickAccessSidebar />
        <main className="flex-1 pt-14 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
