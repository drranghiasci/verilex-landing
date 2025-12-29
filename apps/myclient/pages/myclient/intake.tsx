import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';

export default function IntakePage() {
  const router = useRouter();
  const { state } = useFirm();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [matterTitle, setMatterTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Client first and last name are required.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setError(sessionError?.message || 'Please sign in.');
        return;
      }

      const payload = {
        client_first_name: firstName,
        client_last_name: lastName,
        client_email: email || undefined,
        client_phone: phone || undefined,
        matter_title: matterTitle || undefined,
        notes: notes || undefined,
      };

      const res = await fetch('/api/myclient/cases/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.caseId) {
        setError(data.error || 'Unable to create case.');
        return;
      }

      router.push(`/myclient/cases/${data.caseId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create case.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>MyClient | New Case Intake</title>
      </Head>
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">New Case Intake</h1>
        <p className="mt-2 text-sm text-[color:var(--text-2)]">
          Firm {state.firmId ? state.firmId.slice(0, 8) : 'No firm'} · Role {state.role ?? 'member'}
        </p>

        {state.loading && <p className="mt-6 text-[color:var(--text-2)]">Loading...</p>}
        {!state.loading && !state.authed && <p className="mt-6 text-[color:var(--text-2)]">Please sign in.</p>}
        {!state.loading && state.authed && !state.firmId && (
          <p className="mt-6 text-[color:var(--text-2)]">No firm linked yet.</p>
        )}

        {state.authed && state.firmId && (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[color:var(--text-2)]">
                Client first name *
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
              </label>
              <label className="block text-sm text-[color:var(--text-2)]">
                Client last name *
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[color:var(--text-2)]">
                Client email (optional)
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>
              <label className="block text-sm text-[color:var(--text-2)]">
                Client phone (optional)
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>
            </div>

            <label className="block text-sm text-[color:var(--text-2)]">
              Matter title (optional)
              <input
                value={matterTitle}
                onChange={(event) => setMatterTitle(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                placeholder={`${lastName || 'Last'}, ${firstName || 'First'} — Divorce`}
              />
            </label>

            <label className="block text-sm text-[color:var(--text-2)]">
              Case summary / notes (optional)
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </label>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
            >
              {submitting ? 'Creating…' : 'Create Case'}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
