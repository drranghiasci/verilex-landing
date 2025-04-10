'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("Dashboard Layout Session:", data?.session);
      if (error) {
        console.log("Session error:", error.message);
      }
    })();
  }, []);
  
  return (
    <div>
      {children}
    </div>
  );
}
