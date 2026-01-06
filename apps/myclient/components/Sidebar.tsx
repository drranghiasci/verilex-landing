import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FilePlus2,
  FolderOpen,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react';

type SidebarProps = {
  currentPath: string;
  mode?: 'desktop' | 'mobile';
  open?: boolean;
  onClose?: () => void;
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </svg>
);

const NAV_ITEMS = [
  { href: '/myclient/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/myclient/cases', label: 'Active Cases', icon: Briefcase },
  { href: '/myclient/calendar', label: 'Calendar', icon: CalendarIcon },
  { href: '/myclient/intake', label: 'New Intake', icon: FilePlus2 },
  { href: '/myclient/documents', label: 'Documents', icon: FolderOpen },
  { href: '/myclient/members', label: 'My Team', icon: Users },
  { href: '/myclient/settings', label: 'Settings', icon: Settings },
  { href: '/myclient/upgrade', label: 'Upgrade', icon: Sparkles, highlight: true },
];

export default function Sidebar({ currentPath, mode = 'desktop', open = false, onClose }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const isMobile = mode === 'mobile';
  const showLabels = isMobile || expanded;

  useEffect(() => {
    if (!isMobile) return;
    setExpanded(false);
  }, [isMobile]);

  return (
    <>
      {isMobile && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className={[
            'fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] transition-opacity',
            open ? 'opacity-100' : 'pointer-events-none opacity-0',
          ].join(' ')}
        />
      )}
      <aside
        onMouseEnter={() => {
          if (!isMobile) setExpanded(true);
        }}
        onMouseLeave={() => {
          if (!isMobile) setExpanded(false);
        }}
        className={[
          'fixed left-0 top-16 z-40 h-[calc(100vh-64px)] border-r border-[color:var(--border)] bg-[rgba(10,10,12,0.92)] backdrop-blur',
          'transition-all duration-200 ease-out',
          isMobile ? 'w-64' : showLabels ? 'w-56' : 'w-16',
          isMobile ? (open ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col gap-3 px-3 py-4">
          <nav className="flex flex-1 flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!showLabels ? item.label : undefined}
                  className={[
                    'relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-[color:var(--muted)] hover:text-white hover:bg-white/5',
                    item.highlight ? 'border border-[color:var(--accent-light)]/60 text-[color:var(--accent-soft)]' : '',
                  ].join(' ')}
                  onClick={isMobile ? onClose : undefined}
                >
                  <span
                    className={[
                      'absolute left-1 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[color:var(--accent)] transition-opacity',
                      isActive ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}
                  />
                  <span
                    className={[
                      'relative flex h-8 w-8 items-center justify-center rounded-lg transition',
                      isActive && !showLabels ? 'bg-[color:var(--accent)]/15 text-white' : '',
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={[
                      'whitespace-nowrap transition-opacity duration-200',
                      showLabels ? 'opacity-100' : 'opacity-0',
                    ].join(' ')}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
