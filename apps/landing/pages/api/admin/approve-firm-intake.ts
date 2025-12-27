import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

type ApproveBody = { intakeId?: string };

type FirmIntakeRow = {
  id: string;
  status: 'new' | 'reviewing' | 'approved' | 'rejected';
  approved_firm_id: string | null;
  firm_name: string;
  firm_website: string | null;
  office_state: string | null;
  office_county: string | null;
  practice_focus: string[];
  admin_email: string;
};

type FirmRow = {
  id: string;
};

type FirmInviteRow = {
  id: string;
};

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_TOKEN || req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { intakeId } = (req.body ?? {}) as ApproveBody;

  if (!intakeId || typeof intakeId !== 'string') {
    return res.status(400).json({ error: 'intakeId is required' });
  }

  const { data: intakeData, error: intakeError } = await supabaseAdmin
    .from('firm_intakes')
    .select(
      [
        'id',
        'status',
        'approved_firm_id',
        'firm_name',
        'firm_website',
        'office_state',
        'office_county',
        'practice_focus',
        'admin_email',
      ].join(', '),
    )
    .eq('id', intakeId)
    .single<FirmIntakeRow>();

  const intake = intakeData ?? null;

  if (intakeError || !intake) {
    return res.status(404).json({ error: intakeError?.message || 'Firm intake not found' });
  }

  if (intake.status === 'approved' || intake.approved_firm_id) {
    return res.status(400).json({
      error: 'Firm intake already approved',
      firmId: intake.approved_firm_id ?? null,
    });
  }

  const { data: firmInsertData, error: firmError } = await supabaseAdmin
    .from('firms')
    .insert({
      name: intake.firm_name,
      website: intake.firm_website,
      office_state: intake.office_state,
      office_county: intake.office_county,
      practice_focus: intake.practice_focus,
    })
    .select('id')
    .single<FirmRow>();

  const firmInsert = firmInsertData ?? null;

  if (firmError || !firmInsert) {
    return res.status(500).json({ error: firmError?.message || 'Unable to create firm' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('firm_intakes')
    .update({
      status: 'approved',
      approved_firm_id: firmInsert.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', intakeId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  const { data: inviteRow, error: inviteInsertError } = await supabaseAdmin
    .from('firm_invites')
    .insert({
      firm_id: firmInsert.id,
      email: intake.admin_email,
      role: 'admin',
      status: 'pending',
    })
    .select('id')
    .single<FirmInviteRow>();

  if (inviteInsertError || !inviteRow) {
    return res.status(500).json({ error: inviteInsertError?.message || 'Unable to create invite record' });
  }

  const redirectUrl = 'https://myclient.verilex.us/auth/callback';

  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(intake.admin_email, {
    redirectTo: redirectUrl,
  });

  if (inviteError) {
    return res.status(200).json({
      ok: true,
      firmId: firmInsert.id,
      inviteSent: false,
      inviteError: inviteError.message,
    });
  }

  return res.status(200).json({
    ok: true,
    firmId: firmInsert.id,
    inviteSent: true,
  });
}
