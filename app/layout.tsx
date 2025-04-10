'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import QuickAccessSidebar from '@/components/dashboard/QuickAccessSidebar'; // or wherever yours is
import '@/styles/globals.css'; // Ensure dark mode classes are in your CSS

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check Supabase auth session on mount
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data?.session) {
        router.push('/login');
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-800">
        Checking session...
      </div>
    );
  }

  if (!session) {
    // If there's no session, user is redirected to /login above
    return null;
  }

  return (
    // Dark mode toggle: if `darkMode` is true, add a `dark` class on the top-level
    <div className={darkMode ? 'dark bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}>
      {/* TOP NAV */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="text-xl font-bold dark:text-gray-50">VeriLex AI</div>
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>

          {/* Display user email or name */}
          <div className="text-sm hidden md:block dark:text-gray-100">
            Logged in as <strong>{session.user.email}</strong>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="text-sm bg-black text-white px-3 py-1 rounded hover:bg-gray-800 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* SIDEBAR + MAIN CONTENT WRAPPER */}
      <div className="relative min-h-screen flex">
        {/* Left Sidebar */}
        <QuickAccessSidebar />

        {/* Main content */}
        <main className="flex-1 ml-16 md:ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
