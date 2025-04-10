'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BellIcon } from '@heroicons/react/24/outline';

interface Notification {
  id: string;
  client_name: string;
  message: string;
  type: string; // e.g. 'message', 'upload', 'status'
  created_at: string;
}

export default function ClientPortalNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error loading notifications:', error);
      } else {
        setNotifications(data);
      }

      setLoading(false);
    };

    fetchNotifications();
  }, []);

  return (
    <div className="bg-white p-6 shadow rounded-xl mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BellIcon className="w-6 h-6 text-gray-600" />
          Client Portal Notifications
        </h2>
        <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
      </div>

      {loading ? (
        <p className="text-gray-600 text-sm">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-500 text-sm">No new client activity.</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notif) => (
            <li key={notif.id} className="text-sm border-b border-gray-200 pb-2">
              <span className="font-medium">{notif.client_name}</span> —{' '}
              {notif.type === 'upload' && 'uploaded a document'}
              {notif.type === 'message' && 'sent a message'}
              {notif.type === 'status' && 'received a case update'}
              <br />
              <span className="text-gray-500">{notif.message}</span>
              <br />
              <span className="text-xs text-gray-400">{new Date(notif.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
