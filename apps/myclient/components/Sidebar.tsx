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
};

const NAV_ITEMS = [
  { href: '/myclient/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/myclient/cases', label: 'Active Cases', icon: Briefcase },
  { href: '/myclient/intake', label: 'New Intake', icon: FilePlus2 },
  { href: '/myclient/documents', label: 'Documents', icon: FolderOpen },
  { href: '/myclient/members', label: 'My Team', icon: Users },
  { href: '/myclient/settings', label: 'Settings', icon: Settings },
  { href: '/myclient/upgrade', label: 'Upgrade', icon: Sparkles, highlight: true },
];

export default function Sidebar({ currentPath }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const showLabels = expanded || isMobile;

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={[
        'fixed left-0 top-16 z-40 h-[calc(100vh-64px)] border-r border-white/10 bg-[rgba(10,10,12,0.92)] backdrop-blur',
        'transition-all duration-300 ease-out',
        showLabels ? 'w-56' : 'w-16',
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
                className={[
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                  isActive ? 'bg-white/10 text-white' : 'text-[color:var(--text-2)] hover:text-white hover:bg-white/5',
                  item.highlight ? 'border border-[color:var(--accent-light)]/60 text-[color:var(--accent-soft)]' : '',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
                {showLabels && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
