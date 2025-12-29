import Head from 'next/head';
import Link from 'next/link';
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
      if (!state.firmId) {
        setError('No firm linked yet.');
        return;
      }

      const clientName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const summaryParts: string[] = [];
      if (matterTitle.trim()) summaryParts.push(`Matter: ${matterTitle.trim()}`);
      if (email.trim()) summaryParts.push(`Email: ${email.trim()}`);
      if (phone.trim()) summaryParts.push(`Phone: ${phone.trim()}`);
      if (notes.trim()) summaryParts.push(notes.trim());

      const intakeSummary = summaryParts.length > 0 ? summaryParts.join('\n') : null;

      const { data, error: insertError } = await supabase
        .from('cases')
        .insert({
          firm_id: state.firmId,
          client_name: clientName,
          matter_type: 'divorce',
          status: 'open',
          intake_summary: intakeSummary,
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !data?.id) {
        setError(insertError?.message || 'Unable to create case.');
        return;
      }

      router.push(`/myclient/cases/${data.id}`);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/myclient/app"
            className="text-sm text-[color:var(--text-2)] hover:text-white transition"
          >
            ← Back
          </Link>
          <h1 className="text-3xl font-semibold text-white">New Case Intake</h1>
        </div>
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
