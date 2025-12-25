import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type ClaimBody = {
  inviteId?: string;
};

type FirmInvite = {
  id: string;
  firm_id: string;
  email: string;
  role: string;
  status: string;
  accepted_at: string | null;
  accepted_user_id: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const { inviteId } = (req.body ?? {}) as ClaimBody;
  if (!inviteId || typeof inviteId !== 'string') {
    return res.status(400).json({ error: 'inviteId is required' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'Missing Authorization token' });
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: userData, error: userError } = await anonClient.auth.getUser(token);

  if (userError || !userData?.user?.email) {
    return res.status(401).json({ error: userError?.message || 'Invalid access token' });
  }

  const userId = userData.user.id;
  const userEmail = userData.user.email;

  const { data: invite, error: inviteError } = await supabaseAdmin
    .from('firm_invites')
    .select('*')
    .eq('id', inviteId)
    .maybeSingle<FirmInvite>();

  if (inviteError || !invite) {
    return res.status(404).json({ error: inviteError?.message || 'Invite not found' });
  }

  if (invite.status === 'accepted' || invite.accepted_at) {
    return res.status(400).json({ error: 'Invite already accepted' });
  }

  if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return res.status(403).json({ error: 'Invite email does not match authenticated user' });
  }

  const { error: upsertError } = await supabaseAdmin
    .from('firm_members')
    .upsert(
      {
        firm_id: invite.firm_id,
        user_id: userId,
        role: invite.role ?? 'member',
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'firm_id,user_id' },
    );

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  const { error: inviteUpdateError } = await supabaseAdmin
    .from('firm_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_user_id: userId,
    })
    .eq('id', inviteId);

  if (inviteUpdateError) {
    return res.status(500).json({ error: inviteUpdateError.message });
  }

  return res.status(200).json({ ok: true, firmId: invite.firm_id });
}
