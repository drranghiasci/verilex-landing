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
  const [copied, setCopied] = useState(false);

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
        .select('id, name, created_at')
        .eq('id', state.firmId)
        .single();

      if (!isMounted) return;
      if (firmError) {
        setError(firmError.message);
        setFirm(null);
      } else {
        setFirm(data);
        setFirmName(data?.name ?? '');
      }
      setLoadingFirm(false);
    };

    loadFirm();
    return () => {
      isMounted = false;
    };
  }, [state.authed, state.firmId]);

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
    const { error: updateError } = await supabase
      .from('firms')
      .update({ name: nextName })
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

    setFirm({ ...firm, name: nextName });
    setSaved(true);
    setSaving(false);
  };

  if (state.loading) {
    return <p className="text-[color:var(--text-2)]">Loading...</p>;
  }

  if (!state.authed) {
    return <p className="text-[color:var(--text-2)]">Redirecting to sign in...</p>;
  }

  if (!canManageMembers(state.role)) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8">
        <Link href="/myclient/app" className="text-sm text-[color:var(--text-2)] hover:text-white transition">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-white">Firm Settings</h1>
        <p className="mt-3 text-sm text-[color:var(--text-2)]">Admin only. Please contact your firm admin.</p>
        <Link
          href="/myclient/app"
          className="mt-6 inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5"
        >
          Return to dashboard
        </Link>
      </div>
    );
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
              {saved && (
                <p className="text-sm text-emerald-300">Saved</p>
              )}

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
