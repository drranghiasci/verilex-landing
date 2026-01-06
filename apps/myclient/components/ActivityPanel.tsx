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

  return (
    <>
      <button
        type="button"
        aria-label="Close activity"
        className={[
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        onClick={onClose}
      />
      <aside
        aria-label="Activity panel"
        className={[
          'fixed right-0 top-16 z-50 h-[calc(100vh-64px)] w-full max-w-[420px] border-l border-[color:var(--border)] bg-[var(--surface-0)] shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Activity</h2>
              <Link
                href="/myclient/activity"
                onClick={onClose}
                className="rounded-lg border border-white/15 px-2.5 py-1 text-xs text-[color:var(--muted)] hover:text-white"
              >
                View all
              </Link>
            </div>
            <button
              type="button"
              aria-label="Close activity"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-[color:var(--muted)] hover:text-white"
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
