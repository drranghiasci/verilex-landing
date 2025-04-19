'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';
import TopMenu from '@/components/dashboard/TopMenu';

type ProfileRow = {
  beta_access: boolean | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any | undefined>(undefined); // use undefined as initial state
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      const {
        data: { session: fetchedSession },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr || !fetchedSession) {
        console.error('Session error:', sessionErr);
        if (isMounted) {
          setSession(null); // explicitly unauthenticated
          setRedirectPath('/login');
          setLoading(false);
        }
        return;
      }

      if (isMounted) setSession(fetchedSession);

      // Look up the beta_access flag in profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('beta_access')
        .eq('id', fetchedSession.user.id)
        .single();

      // Updated error handling: redirect to registration if profile fetch fails
      if (profileErr) {
        console.error('Profile fetch error:', profileErr);
        if (isMounted) {
          setRedirectPath('/register');
          setLoading(false);
        }
        return;
      }

      // Ensure the profiles table sets beta_access appropriately
      if (!profile?.beta_access) {
        if (isMounted) {
          setRedirectPath('/request-access');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(false); // session is good and beta_access is true
      }
    };

    checkAccess();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => checkAccess(), 250); // delay helps avoid double exec
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    console.log('Session:', session);
    console.log('Loading:', loading);
    console.log('RedirectPath:', redirectPath);

    // Only redirect if loading is complete and session has resolved
    if (!loading && redirectPath !== null && session !== undefined) {
      router.replace(redirectPath);
    }
  }, [loading, redirectPath, session, router]);

  if (loading || session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking access&hellip;
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopMenu />
      <div className="flex min-h-screen bg-gray-50">
        <QuickAccessSidebar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
