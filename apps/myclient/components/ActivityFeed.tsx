import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';

type ActivityItem = {
  id: string;
  case_id: string | null;
  message: string;
  created_at: string;
};

type ActivityFeedProps = {
  limit?: number;
};

export default function ActivityFeed({ limit = 10 }: ActivityFeedProps) {
  const { state } = useFirm();
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;
    let mounted = true;
    const loadActivity = async () => {
      setError(null);
      const { data, error: activityError } = await supabase
        .from('case_activity')
        .select('id, case_id, message, created_at')
        .eq('firm_id', state.firmId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!mounted) return;
      if (activityError) {
        setError(activityError.message);
        setActivity([]);
      } else {
        setActivity(data ?? []);
      }
    };
    loadActivity();
    return () => {
      mounted = false;
    };
  }, [limit, state.authed, state.firmId]);

  if (!state.firmId) {
    return <p className="text-sm text-[color:var(--text-2)]">No activity yet.</p>;
  }

  if (error) {
    return <p className="text-xs text-red-300">{error}</p>;
  }

  if (activity.length === 0) {
    return <p className="text-sm text-[color:var(--text-2)]">No recent activity.</p>;
  }

  return (
    <ul className="space-y-3 text-sm text-[color:var(--text-2)]">
      {activity.map((item) => (
        <li key={item.id} className="rounded-xl border border-white/10 bg-[var(--surface-0)] px-3 py-2">
          <div className="flex flex-col gap-1">
            {item.case_id ? (
              <Link href={`/myclient/cases/${item.case_id}`} className="text-white hover:text-[color:var(--accent-soft)]">
                {item.message}
              </Link>
            ) : (
              <p className="text-white">{item.message}</p>
            )}
            <span className="text-xs text-[color:var(--text-2)]">{new Date(item.created_at).toLocaleString()}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
