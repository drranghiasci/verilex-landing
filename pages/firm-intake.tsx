import Head from 'next/head';
import Link from 'next/link';
import { useState, FormEvent, ChangeEvent } from 'react';

const PRACTICE_OPTIONS = ['Divorce', 'Custody', 'Support', 'Protective Orders', 'Mediation'] as const;
const MONTHLY_MATTER_OPTIONS = ['< 10', '10 - 24', '25 - 49', '50 - 99', '100+'] as const;
const USER_COUNT_OPTIONS = ['1', '2-3', '4-6', '7-10', '10+'] as const;
const CMS_OPTIONS = ['Clio', 'MyCase', 'PracticePanther', 'Smokeball', 'Not Using One', 'Other'] as const;

type PracticeOption = (typeof PRACTICE_OPTIONS)[number];

interface FormState {
  firmName: string;
  firmWebsite: string;
  state: string;
  county: string;
  practiceFocus: PracticeOption[];
  monthlyMatters: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  attorneyUsers: string;
  staffUsers: string;
  additionalUserEmails: string;
  billingEmail: string;
  cms: string;
  cmsOther: string;
  dataMigrationNeeded: string;
  notes: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_FORM_STATE: FormState = {
  firmName: '',
  firmWebsite: '',
  state: '',
  county: '',
  practiceFocus: [],
  monthlyMatters: '',
  adminName: '',
  adminEmail: '',
  adminPhone: '',
  attorneyUsers: '',
  staffUsers: '',
  additionalUserEmails: '',
  billingEmail: '',
  cms: '',
  cmsOther: '',
  dataMigrationNeeded: '',
  notes: '',
};

export default function FirmIntakePage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const updateField = (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const togglePracticeFocus = (option: PracticeOption) => {
    setForm((prev) => {
      const alreadySelected = prev.practiceFocus.includes(option);
      const nextFocus = alreadySelected ? prev.practiceFocus.filter((item) => item !== option) : [...prev.practiceFocus, option];
      return { ...prev, practiceFocus: nextFocus };
    });
  };

  const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!form.firmName.trim()) nextErrors.firmName = 'Firm name is required.';
    if (!form.monthlyMatters) nextErrors.monthlyMatters = 'Select the average number of new matters.';
    if (!form.adminName.trim()) nextErrors.adminName = 'Primary admin contact is required.';
    if (!form.adminEmail.trim() || !emailRegex.test(form.adminEmail)) nextErrors.adminEmail = 'Enter a valid email.';
    if (!form.adminPhone.trim()) nextErrors.adminPhone = 'Enter a phone number.';
    if (!form.attorneyUsers) nextErrors.attorneyUsers = 'Select attorney count.';
    if (!form.staffUsers) nextErrors.staffUsers = 'Select staff count.';
    if (!form.cms) nextErrors.cms = 'Select a case management system.';
    if (form.cms === 'Other' && !form.cmsOther.trim()) nextErrors.cmsOther = 'Provide the system name.';
    if (!form.dataMigrationNeeded) nextErrors.dataMigrationNeeded = 'Let us know if migration is needed.';
    if (form.billingEmail && !emailRegex.test(form.billingEmail)) nextErrors.billingEmail = 'Enter a valid email.';

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/firm-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error('Unable to submit this intake. Please try again.');

      setIsSuccess(true);
      setForm(INITIAL_FORM_STATE);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSuccessState = () => (
    <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[var(--surface-1)] p-10 text-center shadow-2xl">
      <h2 className="text-3xl font-semibold text-[color:var(--accent)]">We received your firm details.</h2>
      <p className="mt-4 text-[color:var(--text-1)]">
        Our onboarding team will review your information and reach out within one business day to finalize your multi-account setup and migration plan.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-[color:var(--accent-light)] px-5 py-2.5 font-medium text-[color:var(--accent-soft)] hover:bg-[color:var(--accent-light)] hover:text-white transition-colors"
        >
          Back to Home
        </Link>
        <button
          type="button"
          onClick={() => setIsSuccess(false)}
          className="rounded-lg bg-[color:var(--accent-light)] px-5 py-2.5 font-semibold text-white shadow hover:bg-[color:var(--accent)] transition-colors"
        >
          Submit Another Firm
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>VeriLex AI | Firm Intake</title>
        <meta name="description" content="Onboard your family law firm to VeriLex AI. Provide firm details, contacts, and migration needs to get started." />
      </Head>
      <div className="min-h-screen bg-[var(--surface-0)] px-4 py-16 text-[color:var(--text-1)] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">Firm Onboarding</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">Family Law Intake</h1>
            <p className="mt-4 text-lg text-[color:var(--text-2)]">
              Share the details we need to configure VeriLex for your divorce and custody team, including multi-account access for partners and support staff.
            </p>
          </div>
          {isSuccess ? (
            renderSuccessState()
          ) : (
            <form onSubmit={handleSubmit} className="space-y-10 rounded-2xl border border-white/10 bg-[var(--surface-1)] p-8 shadow-2xl">
              <section className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-white">
                    Firm Name <span className="text-[color:var(--accent)]">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.firmName}
                    onChange={updateField('firmName')}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="Smith & Delgado, PLLC"
                  />
                  {errors.firmName && <p className="mt-1 text-sm text-red-400">{errors.firmName}</p>}
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white">Firm Website</label>
                    <input
                      type="url"
                      value={form.firmWebsite}
                      onChange={updateField('firmWebsite')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">Preferred Billing Email</label>
                    <input
                      type="email"
                      value={form.billingEmail}
                      onChange={updateField('billingEmail')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      placeholder="billing@firm.com"
                    />
                    {errors.billingEmail && <p className="mt-1 text-sm text-red-400">{errors.billingEmail}</p>}
                  </div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white">Main Office State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={updateField('state')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      placeholder="e.g., Virginia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">County</label>
                    <input
                      type="text"
                      value={form.county}
                      onChange={updateField('county')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                      placeholder="Fairfax County"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Practice Focus</h2>
                  <p className="text-sm text-[color:var(--text-2)]">Select all areas we should configure for your automations.</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {PRACTICE_OPTIONS.map((option) => {
                      const checked = form.practiceFocus.includes(option);
                      return (
                        <label
                          key={option}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                            checked ? 'border-[color:var(--accent-light)] bg-[color:var(--surface-0)] text-white' : 'border-white/10 bg-transparent text-[color:var(--text-1)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePracticeFocus(option)}
                            className="h-4 w-4 rounded border-white/20 bg-transparent text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      Approx. Monthly New Matters <span className="text-[color:var(--accent)]">*</span>
                    </label>
                    <select
                      value={form.monthlyMatters}
                      onChange={updateField('monthlyMatters')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text-1)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                      <option value="">Select volume</option>
                      {MONTHLY_MATTER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.monthlyMatters && <p className="mt-1 text-sm text-red-400">{errors.monthlyMatters}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">Case Management System</label>
                    <select
                      value={form.cms}
                      onChange={updateField('cms')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text-1)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                      <option value="">Select a platform</option>
                      {CMS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.cms && <p className="mt-1 text-sm text-red-400">{errors.cms}</p>}
                    {form.cms === 'Other' && (
                      <input
                        type="text"
                        value={form.cmsOther}
                        onChange={updateField('cmsOther')}
                        className="mt-3 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="Share the name of your system"
                      />
                    )}
                    {errors.cmsOther && <p className="mt-1 text-sm text-red-400">{errors.cmsOther}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Primary Admin Contact</h2>
                  <div className="mt-4 grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-white">
                        Full Name <span className="text-[color:var(--accent)]">*</span>
                      </label>
                      <input
                        type="text"
                        value={form.adminName}
                        onChange={updateField('adminName')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="Jordan Kim"
                      />
                      {errors.adminName && <p className="mt-1 text-sm text-red-400">{errors.adminName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white">
                        Email <span className="text-[color:var(--accent)]">*</span>
                      </label>
                      <input
                        type="email"
                        value={form.adminEmail}
                        onChange={updateField('adminEmail')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="operations@firm.com"
                      />
                      {errors.adminEmail && <p className="mt-1 text-sm text-red-400">{errors.adminEmail}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white">
                        Phone <span className="text-[color:var(--accent)]">*</span>
                      </label>
                      <input
                        type="tel"
                        value={form.adminPhone}
                        onChange={updateField('adminPhone')}
                        className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                        placeholder="(555) 123-4567"
                      />
                      {errors.adminPhone && <p className="mt-1 text-sm text-red-400">{errors.adminPhone}</p>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      Attorney Accounts Needed <span className="text-[color:var(--accent)]">*</span>
                    </label>
                    <select
                      value={form.attorneyUsers}
                      onChange={updateField('attorneyUsers')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text-1)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                      <option value="">Select count</option>
                      {USER_COUNT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.attorneyUsers && <p className="mt-1 text-sm text-red-400">{errors.attorneyUsers}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white">
                      Staff / Paralegal Accounts <span className="text-[color:var(--accent)]">*</span>
                    </label>
                    <select
                      value={form.staffUsers}
                      onChange={updateField('staffUsers')}
                      className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 text-[color:var(--text-1)] outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    >
                      <option value="">Select count</option>
                      {USER_COUNT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.staffUsers && <p className="mt-1 text-sm text-red-400">{errors.staffUsers}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white">
                    Additional User Emails <span className="text-[color:var(--text-2)] font-normal">(comma or newline separated)</span>
                  </label>
                  <textarea
                    value={form.additionalUserEmails}
                    onChange={updateField('additionalUserEmails')}
                    rows={3}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="partner@firm.com, intake@firm.com"
                  />
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <span className="block text-sm font-semibold text-white">
                    Data Migration Needed? <span className="text-[color:var(--accent)]">*</span>
                  </span>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {['Yes', 'No'].map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[color:var(--text-1)]">
                        <input
                          type="radio"
                          name="data-migration"
                          value={option.toLowerCase()}
                          checked={form.dataMigrationNeeded === option.toLowerCase()}
                          onChange={updateField('dataMigrationNeeded')}
                          className="h-4 w-4 border-white/20 bg-transparent text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  {errors.dataMigrationNeeded && <p className="mt-1 text-sm text-red-400">{errors.dataMigrationNeeded}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-white">Anything else we should know?</label>
                  <textarea
                    value={form.notes}
                    onChange={updateField('notes')}
                    rows={4}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-[var(--surface-0)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
                    placeholder="Share key workflows, integrations, or timelines."
                  />
                </div>
              </section>

              {submitError && <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{submitError}</div>}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-[color:var(--text-2)]">We’ll configure multi-account access and data migration in under 5 business days.</p>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-[color:var(--accent-light)] px-6 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Intake'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
