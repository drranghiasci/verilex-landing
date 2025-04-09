'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        setEmail(data.user.email || ''); // Ensure email is a string
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 text-gray-900 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← Back to Dashboard</Link>
          <button onClick={handleLogout} className="text-sm bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800">
            Log Out
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6">⚙️ Account Settings</h1>

        <div className="bg-white p-6 rounded-xl shadow space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full border border-gray-300 rounded-md px-4 py-2 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <p className="text-sm text-gray-600">Password management coming soon.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notifications</label>
            <p className="text-sm text-gray-600">Customize alerts and email reminders (coming soon).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm Preferences</label>
            <p className="text-sm text-gray-600">Personalize dashboard layout, case defaults, and more (coming soon).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
