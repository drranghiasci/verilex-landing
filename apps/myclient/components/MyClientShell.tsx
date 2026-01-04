import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import ProfileMenu from '@/components/ProfileMenu';
import Sidebar from '@/components/Sidebar';

export default function MyClientShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state } = useFirm();
  const [meData, setMeData] = useState<{
    user: { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
    membership: { firm_id: string; role: string } | null;
    firm: { name: string | null } | null;
  } | null>(null);
  const [meError, setMeError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/sign-in');
  };

  useEffect(() => {
    if (!state.authed) {
      setMeData(null);
      return;
    }
    let mounted = true;
    const loadMe = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        if (mounted) setMeError(sessionError?.message || 'Please sign in.');
        return;
      }

      const res = await fetch('/api/myclient/me', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (mounted) setMeError(data.error || 'Unable to load profile.');
        return;
      }

      if (mounted) {
        setMeData({
          user: data.user ?? null,
          membership: data.membership ?? null,
          firm: data.firm ?? null,
        });
        setMeError(null);
      }
    };

    loadMe();
    return () => {
      mounted = false;
    };
  }, [state.authed]);

  const profileIncomplete = state.authed && (!meData?.user?.full_name || !meData.user.full_name.trim());

  return (
    <div className="flex min-h-screen bg-[var(--surface-0)] text-[color:var(--text-1)]">
      {state.authed && <Sidebar currentPath={router.pathname} />}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-white/10 bg-[var(--surface-1)] px-6 py-4 pl-56 md:pl-20">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
            <Link href="/myclient/app" className="text-lg font-semibold text-white">
              MyClient
            </Link>
            {state.authed && (
              <ProfileMenu
                user={meData?.user ?? null}
                role={meData?.membership?.role ?? state.role ?? null}
                firmName={meData?.firm?.name ?? null}
                firmId={meData?.membership?.firm_id ?? state.firmId ?? null}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </header>
        {state.authed ? (
          <main className="px-6 py-12 pl-56 md:pl-20">
            {meError && (
              <div className="mx-auto mb-6 max-w-6xl rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {meError}
              </div>
            )}
            {profileIncomplete && (
              <div className="mx-auto mb-6 flex max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[var(--surface-1)] px-6 py-4 text-sm text-[color:var(--text-2)] sm:flex-row sm:items-center">
                <span>Finish setting up your profile to personalize VeriLex.</span>
                <Link
                  href="/myclient/profile"
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-xs font-semibold text-white hover:bg-[color:var(--accent)] transition"
                >
                  Complete Profile
                </Link>
              </div>
            )}
            {children}
          </main>
        ) : (
          <main className="px-6 py-20">
            <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 text-center shadow-2xl">
              <h1 className="text-3xl font-semibold text-white">MyClient Portal</h1>
              <p className="mt-4 text-[color:var(--text-2)]">
                Sign in to access your firm workspace.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white hover:bg-[color:var(--accent)] transition"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
