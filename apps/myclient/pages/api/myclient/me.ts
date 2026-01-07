import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type MeResponse = {
  ok: boolean;
  user?: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    timezone: string | null;
  };
  membership?: { firm_id: string; role: string } | null;
  firm?: { name: string | null } | null;
  error?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<MeResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing authorization token' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({ ok: false, error: 'Missing Supabase environment variables' });
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ ok: false, error: 'Invalid session' });
  }

  const userId = authData.user.id;

  type ProfileRow = { full_name?: unknown; avatar_url?: unknown; timezone?: unknown } | null;
  const { data: profileRow, error: profileError } = await adminClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    return res.status(500).json({ ok: false, error: profileError.message });
  }

  const profile = profileRow as ProfileRow;
  const fullName = typeof profile?.full_name === 'string' ? profile.full_name : null;
  const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : null;
  const timezone = typeof profile?.timezone === 'string' ? profile.timezone : null;

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id, role')
    .eq('user_id', userId)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  let firm: { name: string | null } | null = null;

  if (membership?.firm_id) {
    const { data: firmRow, error: firmError } = await adminClient
      .from('firms')
      .select('name')
      .eq('id', membership.firm_id)
      .single();

    if (firmError) {
      return res.status(500).json({ ok: false, error: firmError.message });
    }
    firm = { name: firmRow?.name ?? null };
  }

  return res.status(200).json({
    ok: true,
    user: {
      id: userId,
      email: authData.user.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      timezone,
    },
    membership: membership ? { firm_id: membership.firm_id, role: membership.role } : null,
    firm,
  });
}
