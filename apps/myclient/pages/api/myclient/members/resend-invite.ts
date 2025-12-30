import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { canInviteMember } from '@/lib/plans';

type ResendBody = { email?: string; role?: 'admin' | 'attorney' | 'staff' };

type ErrorResponse = { ok: false; error: string };
type SuccessResponse = { ok: true };

const ALLOWED_ROLES = new Set(['admin', 'attorney', 'staff']);

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

  const body = (req.body ?? {}) as ResendBody;
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = typeof body.role === 'string' ? body.role : '';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Valid email is required' });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ ok: false, error: 'Invalid role' });
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

  const { data: firmRow, error: firmError } = await adminClient
    .from('firms')
    .select('plan')
    .eq('id', membership.firm_id)
    .single();

  if (firmError) {
    return res.status(500).json({ ok: false, error: firmError.message });
  }

  const { count: memberCount, error: countError } = await adminClient
    .from('firm_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('firm_id', membership.firm_id);

  if (countError) {
    return res.status(500).json({ ok: false, error: countError.message });
  }

  const plan = (firmRow?.plan as 'free' | 'pro' | 'enterprise' | undefined) ?? 'free';
  const limitCheck = canInviteMember({ plan, currentMemberCount: memberCount ?? 0 });
  if (!limitCheck.ok) {
    try {
      await adminClient.from('case_activity').insert({
        firm_id: membership.firm_id,
        actor_user_id: authData.user.id,
        event_type: 'plan_limit_hit',
        message: 'Member limit reached',
        metadata: { kind: 'members' },
      });
    } catch {
      // best-effort logging
    }
    return res.status(403).json({ ok: false, error: `${limitCheck.reason} Upgrade to Pro to add more members.` });
  }

  const { error: inviteRowError } = await adminClient
    .from('firm_invites')
    .upsert(
      {
        firm_id: membership.firm_id,
        email,
        role,
        status: 'pending',
        accepted_at: null,
      },
      { onConflict: 'firm_id,email' },
    );

  if (inviteRowError) {
    return res.status(500).json({ ok: false, error: inviteRowError.message });
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://myclient.verilex.us/auth/callback',
  });

  if (inviteError) {
    const message = inviteError.message || 'Unable to send invite.';
    if (message.toLowerCase().includes('user') && message.toLowerCase().includes('already')) {
      return res.status(400).json({
        ok: false,
        error: 'User already registered. Ask them to sign in and use Finalize Firm Access if needed.',
      });
    }
    return res.status(500).json({ ok: false, error: message });
  }

  try {
    await adminClient.from('case_activity').insert({
      firm_id: membership.firm_id,
      case_id: null,
      actor_user_id: authData.user.id,
      event_type: 'invite_resent',
      message: `Resent invite to ${email}`,
      metadata: { email, role },
    });
  } catch {
    // best-effort logging
  }

  return res.status(200).json({ ok: true });
}
