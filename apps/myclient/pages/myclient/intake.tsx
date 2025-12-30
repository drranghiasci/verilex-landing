import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFirm } from '@/lib/FirmProvider';
import { supabase } from '@/lib/supabaseClient';
import { CaseCreateSchema, buildCaseTitle } from '@/lib/caseSchema';

const STATUS_OPTIONS = ['open', 'paused', 'closed'] as const;

export default function IntakePage() {
  const router = useRouter();
  const { state } = useFirm();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [matterType, setMatterType] = useState('Divorce');
  const [status, setStatus] = useState('open');
  const [title, setTitle] = useState('');
  const [hasCustomTitle, setHasCustomTitle] = useState(false);
  const [stateField, setStateField] = useState('');
  const [county, setCounty] = useState('');
  const [courtName, setCourtName] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ firstName?: string; lastName?: string }>({});

  useEffect(() => {
    if (hasCustomTitle) return;
    if (!firstName.trim() && !lastName.trim()) {
      setTitle('');
      return;
    }
    const generated = buildCaseTitle({
      client_first_name: firstName,
      client_last_name: lastName,
      matter_type: matterType,
      title: '',
      status,
      client_email: email,
      client_phone: phone,
      state: stateField,
      county,
      court_name: courtName,
      case_number: caseNumber,
      internal_notes: notes,
    });
    setTitle(generated);
  }, [county, courtName, email, firstName, hasCustomTitle, lastName, matterType, notes, phone, caseNumber, stateField, status]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasCustomTitle(value.trim().length > 0);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (!state.firmId) {
      setError('No firm linked yet.');
      return;
    }

    const parsed = CaseCreateSchema.safeParse({
      client_first_name: firstName,
      client_last_name: lastName,
      client_email: email,
      client_phone: phone,
      title,
      matter_type: matterType,
      status,
      state: stateField,
      county,
      court_name: courtName,
      case_number: caseNumber,
      internal_notes: notes,
    });

    if (!parsed.success) {
      const nextErrors: { firstName?: string; lastName?: string } = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0] === 'client_first_name') nextErrors.firstName = err.message;
        if (err.path[0] === 'client_last_name') nextErrors.lastName = err.message;
      });
      setFieldErrors(nextErrors);
      setError(parsed.error.errors[0]?.message || 'Please check the intake fields.');
      return;
    }

    setSubmitting(true);
    try {
      const input = parsed.data;
      const finalTitle = buildCaseTitle(input);
      const clientName = `${input.client_first_name} ${input.client_last_name}`.trim();

      const { data, error: insertError } = await supabase
        .from('cases')
        .insert({
          firm_id: state.firmId,
          client_name: clientName,
          client_first_name: input.client_first_name,
          client_last_name: input.client_last_name,
          client_email: input.client_email || null,
          client_phone: input.client_phone || null,
          title: finalTitle,
          matter_type: input.matter_type || 'Divorce',
          status: input.status || 'open',
          state: input.state || null,
          county: input.county || null,
          court_name: input.court_name || null,
          case_number: input.case_number || null,
          internal_notes: input.internal_notes || null,
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !data?.id) {
        setError(insertError?.message || 'Unable to create case.');
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const actorId = sessionData.session?.user?.id ?? null;
        await supabase.from('case_activity').insert({
          firm_id: state.firmId,
          case_id: data.id,
          actor_user_id: actorId,
          event_type: 'case_created',
          message: `Case created for ${input.client_last_name}, ${input.client_first_name}`,
          metadata: { source: 'intake' },
        });
      } catch {
        // best-effort logging
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
      <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
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
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {error && (
              <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Client Information</h2>
                  <p className="mt-1 text-sm text-[color:var(--text-2)]">Who is this case for?</p>
                </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-[color:var(--text-2)]">
                First name *
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
                {fieldErrors.firstName && <span className="mt-1 block text-xs text-red-300">{fieldErrors.firstName}</span>}
              </label>
              <label className="block text-sm text-[color:var(--text-2)]">
                Last name *
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  required
                />
                {fieldErrors.lastName && <span className="mt-1 block text-xs text-red-300">{fieldErrors.lastName}</span>}
              </label>
            </div>

                <div>
                  <h3 className="text-sm font-semibold text-white">Contact</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-[color:var(--text-2)]">
                      Email (optional)
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--text-2)]">
                      Phone (optional)
                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Matter Details</h2>
                  <p className="mt-1 text-sm text-[color:var(--text-2)]">Define the case type and tracking basics.</p>
                </div>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Matter type
                  <input
                    value={matterType}
                    onChange={(event) => setMatterType(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-[color:var(--text-2)]">
                  Matter title (optional)
                  <input
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                  <span className="mt-2 block text-xs text-[color:var(--text-2)]">
                    Default title is generated from client + matter type.
                  </span>
                </label>

                <div>
                  <h3 className="text-sm font-semibold text-white">Jurisdiction</h3>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm text-[color:var(--text-2)]">
                      State (optional)
                      <input
                        value={stateField}
                        onChange={(event) => setStateField(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--text-2)]">
                      County (optional)
                      <input
                        value={county}
                        onChange={(event) => setCounty(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--text-2)]">
                      Court name (optional)
                      <input
                        value={courtName}
                        onChange={(event) => setCourtName(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                    <label className="block text-sm text-[color:var(--text-2)]">
                      Case number (optional)
                      <input
                        value={caseNumber}
                        onChange={(event) => setCaseNumber(event.target.value)}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      />
                    </label>
                  </div>
                </div>
              </section>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">Intake Summary</h2>
              <p className="mt-1 text-sm text-[color:var(--text-2)]">Capture key details for your team.</p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className="mt-3 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
              />
            </section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {submitting ? 'Creating…' : 'Create Case'}
              </button>
              <p className="text-xs text-[color:var(--text-2)]">Your data is secured and isolated to your firm.</p>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
