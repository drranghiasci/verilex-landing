import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { canEditCases, FirmRole } from '@/lib/permissions';

type CaseRow = {
  id: string;
  title: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  state: string | null;
  county: string | null;
  status: string;
  internal_notes?: string | null;
};

type EditCaseDrawerProps = {
  open: boolean;
  onClose: () => void;
  caseRow: CaseRow | null;
  role: FirmRole | null;
  onSaved: (updated: CaseRow) => void;
};

const STATUS_OPTIONS = ['open', 'paused', 'closed'] as const;

export default function EditCaseDrawer({ open, onClose, caseRow, role, onSaved }: EditCaseDrawerProps) {
  const [title, setTitle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateField, setStateField] = useState('');
  const [county, setCounty] = useState('');
  const [status, setStatus] = useState('open');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canEdit = canEditCases(role);

  useEffect(() => {
    if (!caseRow) return;
    setTitle(caseRow.title ?? '');
    setFirstName(caseRow.client_first_name ?? '');
    setLastName(caseRow.client_last_name ?? '');
    setEmail(caseRow.client_email ?? '');
    setPhone(caseRow.client_phone ?? '');
    setStateField(caseRow.state ?? '');
    setCounty(caseRow.county ?? '');
    setStatus(caseRow.status ?? 'open');
    setError(null);
    setSuccess(null);
  }, [caseRow, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || !caseRow) return null;

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!canEdit) {
      setError('You don’t have permission to perform this action. Please contact your firm admin.');
      return;
    }
    if (!title.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Title, first name, and last name are required.');
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) {
        setError(sessionError?.message || 'Please sign in.');
        return;
      }

      const res = await fetch('/api/myclient/cases/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          id: caseRow.id,
          title: title.trim(),
          client_first_name: firstName.trim(),
          client_last_name: lastName.trim(),
          client_email: email.trim() || null,
          client_phone: phone.trim() || null,
          state: stateField.trim() || null,
          county: county.trim() || null,
          status,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.error || 'Unable to update case.';
        const lower = String(msg).toLowerCase();
        setError(
          lower.includes('permission') || lower.includes('policy') || lower.includes('not allowed')
            ? 'You don’t have permission to perform this action. Please contact your firm admin.'
            : msg,
        );
        return;
      }

      const updatedRow: CaseRow = {
        ...caseRow,
        title: title.trim(),
        client_first_name: firstName.trim(),
        client_last_name: lastName.trim(),
        client_email: email.trim() || null,
        client_phone: phone.trim() || null,
        state: stateField.trim() || null,
        county: county.trim() || null,
        status,
      };

      onSaved(updatedRow);
      setSuccess('Saved');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update case.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close edit case"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
      />
      <aside className="fixed right-0 top-16 z-50 h-[calc(100vh-64px)] w-full max-w-[420px] border-l border-[color:var(--border)] bg-[var(--surface-0)] shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Edit Case</h2>
            <button
              type="button"
              aria-label="Close edit"
              onClick={onClose}
              className="rounded-lg border border-[color:var(--border)] p-1.5 text-[color:var(--muted)] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="space-y-4 text-sm">
              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white">
                  {success}
                </div>
              )}
              <label className="block text-[color:var(--muted)]">
                Matter title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[color:var(--muted)]">
                  First name
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="block text-[color:var(--muted)]">
                  Last name
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[color:var(--muted)]">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="block text-[color:var(--muted)]">
                  Phone
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[color:var(--muted)]">
                  State
                  <input
                    value={stateField}
                    onChange={(event) => setStateField(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
                <label className="block text-[color:var(--muted)]">
                  County
                  <input
                    value={county}
                    onChange={(event) => setCounty(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                  />
                </label>
              </div>
              <label className="block text-[color:var(--muted)]">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="text-[color:var(--muted)]">Notes preview</p>
                <textarea
                  value={caseRow.internal_notes ?? ''}
                  readOnly
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-[color:var(--border)] bg-[var(--surface-1)] px-3 py-2 text-[color:var(--muted)]"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-[color:var(--border)] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--muted)] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canEdit}
                className="rounded-lg bg-[color:var(--accent-light)] px-5 py-2 text-sm font-semibold text-white hover:bg-[color:var(--accent)] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
