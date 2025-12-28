import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

type MemberRow = {
  user_id: string;
  role: string;
  created_at: string;
  firm_id: string;
  email?: string | null;
  full_name?: string | null;
};

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true; firmId: string; members: MemberRow[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ErrorResponse | SuccessResponse>,
) {
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

  const { data: membershipRows, error: membershipError } = await adminClient
    .from('firm_members')
    .select('firm_id, role')
    .eq('user_id', authData.user.id)
    .limit(1);

  if (membershipError) {
    return res.status(500).json({ ok: false, error: membershipError.message });
  }

  const membership = Array.isArray(membershipRows) && membershipRows.length > 0 ? membershipRows[0] : null;
  if (!membership?.firm_id) {
    return res.status(403).json({ ok: false, error: 'No firm membership found' });
  }

  if (membership.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin access required' });
  }

  const { data: members, error: membersError } = await adminClient
    .from('firm_members')
    .select('user_id, role, created_at, firm_id')
    .eq('firm_id', membership.firm_id)
    .order('created_at', { ascending: true });

  if (membersError) {
    return res.status(500).json({ ok: false, error: membersError.message });
  }

  const memberRows = (members ?? []) as MemberRow[];
  const userIds = memberRows.map((row) => row.user_id);

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    if (!profilesError && profiles) {
      const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
      profiles.forEach((profile: { id: string; email?: string | null; full_name?: string | null }) => {
        profileMap.set(profile.id, {
          email: profile.email ?? null,
          full_name: profile.full_name ?? null,
        });
      });

      memberRows.forEach((row) => {
        const profile = profileMap.get(row.user_id);
        if (profile) {
          row.email = profile.email ?? null;
          row.full_name = profile.full_name ?? null;
        }
      });
    }
  }

  return res.status(200).json({ ok: true, firmId: membership.firm_id, members: memberRows });
}
