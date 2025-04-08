import React from 'react';
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function ProtectedLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) router.push('/login');
    };
    checkSession();
  }, [router]);

  return <>{children}</>;
}
