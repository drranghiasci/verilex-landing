import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (!userResponse.ok) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }

  const userData = (await userResponse.json()) as { id?: string; email?: string };

  if (!userData?.id || !userData?.email) {
    return res.status(401).json({ error: 'User profile incomplete' });
  }

  const { data: intake, error: intakeError } = await supabaseAdmin
    .from('firm_intakes')
    .select('id, approved_firm_id, approved_at, created_at')
    .eq('admin_email', userData.email)
    .eq('status', 'approved')
    .not('approved_firm_id', 'is', null)
    .order('approved_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (intakeError || !intake?.approved_firm_id) {
    return res.status(403).json({ error: 'No approved firm intake found for this user.' });
  }

  const { error: upsertError } = await supabaseAdmin
    .from('firm_members')
    .upsert(
      {
        firm_id: intake.approved_firm_id,
        user_id: userData.id,
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'firm_id,user_id' },
    );

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  return res.status(200).json({ ok: true, firmId: intake.approved_firm_id });
}
