import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type UserInfo = {
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type ProfileMenuProps = {
  user: UserInfo | null;
  role: string | null;
  firmName: string | null;
  firmId: string | null;
  onSignOut: () => Promise<void>;
};

function getInitials(user: UserInfo | null) {
  const name = user?.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    return `${first}${last}`.toUpperCase() || 'U';
  }
  const email = user?.email ?? '';
  const local = email.split('@')[0] ?? '';
  return local.slice(0, 2).toUpperCase() || 'U';
}

export default function ProfileMenu({ user, role, firmName, firmId, onSignOut }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !(event.target instanceof Node)) return;
      if (!containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const displayName = user?.full_name?.trim() || (user?.email ? user.email.split('@')[0] : 'User');
  const firmLabel = firmName?.trim() || 'Firm';
  const firmShort = firmId ? firmId.slice(0, 8) : '—';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-[var(--surface-0)] px-2 py-1.5 text-sm text-white hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user?.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-semibold text-white">
            {getInitials(user)}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-4 text-sm text-[color:var(--text-1)] shadow-2xl"
          role="menu"
        >
          <div className="space-y-1">
            <div className="text-base font-semibold text-white">{displayName}</div>
            <div className="text-xs text-[color:var(--text-2)]">{user?.email ?? 'No email'}</div>
            {role && (
              <span className="inline-flex rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:var(--text-2)]">
                {role}
              </span>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-white/10 bg-[var(--surface-0)] p-3">
            <div className="text-xs uppercase tracking-wide text-[color:var(--text-2)]">Firm</div>
            <div className="mt-1 text-sm text-white">{firmLabel}</div>
            <div className="mt-1 text-xs text-[color:var(--text-2)]">Firm ID: {firmShort}</div>
          </div>

          <div className="mt-4 space-y-2">
            <Link href="/myclient/profile" className="block rounded-lg px-3 py-2 hover:bg-white/5" role="menuitem">
              Edit Profile
            </Link>
            <Link href="/myclient/members" className="block rounded-lg px-3 py-2 hover:bg-white/5" role="menuitem">
              My Team
            </Link>
            <Link href="/myclient/settings" className="block rounded-lg px-3 py-2 hover:bg-white/5" role="menuitem">
              Settings
            </Link>
            <Link
              href="/myclient/upgrade"
              className="block rounded-lg border border-[color:var(--accent-light)] bg-[color:var(--accent-light)]/10 px-3 py-2 text-[color:var(--accent-soft)] hover:bg-[color:var(--accent-light)] hover:text-white"
              role="menuitem"
            >
              Upgrade
            </Link>
          </div>

          <div className="my-4 h-px bg-white/10" />

          <button
            type="button"
            onClick={onSignOut}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-200 hover:bg-white/5"
            role="menuitem"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
