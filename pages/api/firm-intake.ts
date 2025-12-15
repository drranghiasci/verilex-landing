import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type FirmIntakePayload = {
  firmName?: string;
  website?: string;
  state?: string;
  county?: string;
  practiceFocus?: string[];
  monthlyMatters?: string;

  adminName?: string;
  adminEmail?: string;
  adminPhone?: string;

  attorneyUsers?: string;
  staffUsers?: string;
  additionalUserEmails?: string;

  billingEmail?: string;
  cms?: string;
  cmsOther?: string;
  migrationNeeded?: string;
  notes?: string;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeTextArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => (typeof x === 'string' ? x.trim() : ''))
    .filter((x) => x.length > 0)
    .slice(0, 20);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const body = (req.body ?? {}) as FirmIntakePayload;

  // Required fields
  const firmName = (body.firmName ?? '').trim();
  const adminName = (body.adminName ?? '').trim();
  const adminEmail = (body.adminEmail ?? '').trim().toLowerCase();
  const adminPhone = (body.adminPhone ?? '').trim();

  if (firmName.length < 2) return res.status(400).json({ error: 'Firm name is required.' });
  if (adminName.length < 2) return res.status(400).json({ error: 'Admin name is required.' });
  if (!isValidEmail(adminEmail)) return res.status(400).json({ error: 'Valid admin email is required.' });
  if (adminPhone.length < 7) return res.status(400).json({ error: 'Admin phone is required.' });

  // Optional fields
  const practiceFocus = normalizeTextArray(body.practiceFocus);

  const insertRow = {
    // status defaults to 'new' in SQL

    firm_name: firmName,
    firm_website: (body.website ?? '').trim() || null,
    office_state: (body.state ?? '').trim() || null,
    office_county: (body.county ?? '').trim() || null,

    practice_focus: practiceFocus,
    monthly_new_matters: (body.monthlyMatters ?? '').trim() || null,

    admin_name: adminName,
    admin_email: adminEmail,
    admin_phone: adminPhone || null,

    attorney_users: (body.attorneyUsers ?? '').trim() || null,
    staff_users: (body.staffUsers ?? '').trim() || null,
    additional_user_emails: (body.additionalUserEmails ?? '').trim() || null,

    billing_email: (body.billingEmail ?? '').trim() || null,
    case_management_system: (body.cms ?? '').trim() || null,
    case_management_system_other: (body.cmsOther ?? '').trim() || null,
    data_migration_needed: (body.migrationNeeded ?? '').trim() || null,

    notes: (body.notes ?? '').trim() || null,
  };

  try {
    const { data, error } = await supabase.from('firm_intakes').insert(insertRow).select('id').single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error('Supabase firm intake insert failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return res.status(500).json({ error: error.message, code: error.code });
    }

    return res.status(200).json({ ok: true, intakeId: data.id });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unexpected firm intake handler error', error);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
