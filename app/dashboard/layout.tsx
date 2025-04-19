'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar';
import TopMenu            from '@/components/dashboard/TopMenu';

type ProfileRow = {
  beta_access: boolean | null;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    /** Main check: session → profile → beta_access flag */
    const checkAccess = async () => {
      const {
        data: { session: fetchedSession },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr || !fetchedSession) {
        console.error('Session error:', sessionErr);
        if (isMounted) {
          setSession(null);
          setRedirectPath('/login');
          setLoading(false);
        }
        return;
      }

      if (isMounted) setSession(fetchedSession);

      // Look up the profile row
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('beta_access')
        .eq('id', fetchedSession.user.id)
        .single();

      if (profileErr) {
        console.error('Profile fetch error:', profileErr);
        if (isMounted) {
          setRedirectPath('/login');
          setLoading(false);
        }
        return;
      }

      if (!profile?.beta_access) {
        // User exists but has no beta flag → send to request‑access screen
        if (isMounted) {
          setRedirectPath('/request-access');
          setLoading(false);
        }
        return;
      }

      // All good
      if (isMounted) setLoading(false);
    };

    checkAccess();

    /** Listen for auth changes so a brand‑new sign‑up gets re‑validated */
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAccess();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  useEffect(() => {
    console.log('Session:', session);
    console.log('Loading:', loading);
    if (!loading && redirectPath) {
      console.log('Redirecting to', redirectPath);
      router.replace(redirectPath);
    }
  }, [loading, redirectPath, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking access&hellip;
      </div>
    );
  }

  /* -------------------------------------------------------------- */
  /*  Render the actual dashboard layout (user is authenticated &   */
  /*  has beta_access = true)                                       */
  /* -------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <TopMenu />

      <div className="flex min-h-screen bg-gray-50">
        <QuickAccessSidebar />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
