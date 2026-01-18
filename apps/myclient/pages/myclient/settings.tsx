import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { useFirm } from '@/lib/FirmProvider';
import { canManageMembers } from '@/lib/permissions';
import { logActivity } from '@/lib/activity';

type FirmRecord = {
  id: string;
  name: string | null;
  website_url: string | null;
  created_at: string;
};

export default function FirmSettingsPage() {
  const router = useRouter();
  const { state } = useFirm();
  const [firm, setFirm] = useState<FirmRecord | null>(null);
  const [loadingFirm, setLoadingFirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [firmWebsiteUrl, setFirmWebsiteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [profileTimezone, setProfileTimezone] = useState('America/New_York');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const timezoneOptions = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
  ];

  useEffect(() => {
    if (!state.loading && !state.authed) {
      router.replace('/auth/sign-in');
    }
  }, [router, state.authed, state.loading]);

  useEffect(() => {
    if (!state.authed || !state.firmId) return;

    let isMounted = true;
    const loadFirm = async () => {
      setLoadingFirm(true);
      setError(null);
      const { data, error: firmError } = await supabase
        .from('firms')
        .select('id, name, website_url, created_at')
        .eq('id', state.firmId)
        .single();

      if (!isMounted) return;
      if (firmError) {
        setError(firmError.message);
        setFirm(null);
      } else {
        setFirm(data);
        setFirmName(data?.name ?? '');
        setFirmWebsiteUrl(data?.website_url ?? '');
      }
      setLoadingFirm(false);
    };

    loadFirm();
    return () => {
      isMounted = false;
    };
  }, [state.authed, state.firmId]);

  useEffect(() => {
    if (!state.authed) return;
    let isMounted = true;
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        if (isMounted) {
          setProfileError('Please sign in again.');
          setLoadingProfile(false);
        }
        return;
      }
      const res = await fetch('/api/myclient/me', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json().catch(() => ({}));
      if (!isMounted) return;
      if (!res.ok || !payload.ok) {
        setProfileError(payload.error || 'Unable to load profile.');
        setLoadingProfile(false);
        return;
      }
      if (payload.user?.timezone) {
        setProfileTimezone(payload.user.timezone);
      }
      setLoadingProfile(false);
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [state.authed]);

  const handleCopy = async () => {
    if (!firm?.id || !navigator.clipboard) return;
    await navigator.clipboard.writeText(firm.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    if (!firm || !state.firmId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const nextName = firmName.trim();
    const nextWebsiteUrl = firmWebsiteUrl.trim() || null;
    const { error: updateError } = await supabase
      .from('firms')
      .update({ name: nextName, website_url: nextWebsiteUrl })
      .eq('id', state.firmId);

    if (updateError) {
      const msg = updateError.message.toLowerCase().includes('permission')
        ? 'You do not have permission to update firm settings.'
        : updateError.message;
      setError(msg);
      setSaving(false);
      return;
    }

    await logActivity(supabase, {
      firm_id: state.firmId,
      event_type: 'firm_updated',
      message: 'Firm name updated',
      metadata: { old_name: firm.name, new_name: nextName },
    });

    setFirm({ ...firm, name: nextName, website_url: nextWebsiteUrl });
    setSaved(true);
    setSaving(false);
  };

  const handleSaveTimezone = async () => {
    setSavingProfile(true);
    setProfileSaved(false);
    setProfileError(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setProfileError('Please sign in again.');
      setSavingProfile(false);
      return;
    }
    const res = await fetch('/api/myclient/profile/update', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ timezone: profileTimezone }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload.ok) {
      setProfileError(payload.error || 'Unable to update timezone.');
      setSavingProfile(false);
      return;
    }
    setProfileSaved(true);
    setSavingProfile(false);
  };

  if (state.loading) {
    return <p className="text-[color:var(--text-2)]">Loading...</p>;
  }

  if (!state.authed) {
    return <p className="text-[color:var(--text-2)]">Redirecting to sign in...</p>;
  }

  return (
    <>
      <Head>
        <title>MyClient | Firm Settings</title>
      </Head>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href="/myclient/app" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
            ← Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-white">Firm Settings</h1>
        </div>

        {canManageMembers(state.role) ? (
          <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Firm Profile</h2>
            <p className="mt-2 text-sm text-[color:var(--text-2)]">Update the details that appear across MyClient.</p>

            {loadingFirm ? (
              <p className="mt-6 text-sm text-[color:var(--text-2)]">Loading firm profile...</p>
            ) : firm ? (
              <div className="mt-6 grid gap-6">
                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                  Firm name
                  <input
                    value={firmName}
                    onChange={(event) => setFirmName(event.target.value)}
                    className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>

                <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                  Firm website URL
                  <input
                    type="url"
                    value={firmWebsiteUrl}
                    onChange={(event) => setFirmWebsiteUrl(event.target.value)}
                    placeholder="https://example.com"
                    className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--text-2)]">Firm ID</p>
                    <p className="mt-2 text-sm text-white">{firm.id}</p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="mt-3 text-xs text-[color:var(--accent-light)] hover:text-white transition"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[var(--surface-0)] p-4">
                    <p className="text-xs uppercase tracking-wide text-[color:var(--text-2)]">Created</p>
                    <p className="mt-2 text-sm text-white">
                      {new Date(firm.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}
                {saved && <p className="text-sm text-emerald-300">Saved</p>}

                <div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !firmName.trim()}
                    className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[color:var(--text-2)]">Firm profile not found.</p>
            )}
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Firm Profile</h2>
            <p className="mt-2 text-sm text-[color:var(--text-2)]">
              Admin only. Please contact your firm admin for updates.
            </p>
          </section>
        )}

        <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white">Timezone</h2>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">
            Controls how calendar dates and times are displayed.
          </p>
          {loadingProfile ? (
            <p className="mt-6 text-sm text-[color:var(--text-2)]">Loading timezone...</p>
          ) : (
            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-[color:var(--text-2)]">
                Timezone
                <select
                  value={profileTimezone}
                  onChange={(event) => setProfileTimezone(event.target.value)}
                  className="rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-2 text-base text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </label>
              {profileError && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                  {profileError}
                </div>
              )}
              {profileSaved && <p className="text-sm text-emerald-300">Saved</p>}
              <div>
                <button
                  type="button"
                  onClick={handleSaveTimezone}
                  disabled={savingProfile}
                  className="rounded-lg bg-[color:var(--accent-light)] px-4 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? 'Saving...' : 'Save timezone'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8">
          <h2 className="text-lg font-semibold text-white">Coming soon</h2>
          <p className="mt-2 text-sm text-[color:var(--text-2)]">
            Defaults and presets will land here next.
          </p>
          <ul className="mt-4 grid gap-3 text-sm text-[color:var(--text-2)]">
            <li>Default jurisdiction</li>
            <li>Document type presets</li>
            <li>Firm branding</li>
          </ul>
        </section>
      </div>
    </>
  );
}
