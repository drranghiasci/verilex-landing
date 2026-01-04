import Link from 'next/link';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import ActivityFeed from '@/components/ActivityFeed';

type ActivityPanelProps = {
  open: boolean;
  onClose: () => void;
};

export default function ActivityPanel({ open, onClose }: ActivityPanelProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close activity"
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-50 h-screen w-full max-w-[420px] border-l border-white/10 bg-[var(--surface-1)] shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Activity</h2>
              <Link
                href="/myclient/activity"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-[color:var(--text-2)] hover:text-white"
              >
                View all
              </Link>
            </div>
            <button
              type="button"
              aria-label="Close activity"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-[color:var(--text-2)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <ActivityFeed limit={10} />
          </div>
        </div>
      </aside>
    </>
  );
}
