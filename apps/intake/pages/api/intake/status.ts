
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../../../lib/server/supabaseAdmin';
import { verifyIntakeToken } from '../../../../../lib/server/intakeToken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { token, status } = req.body;

    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Missing token' });
    }

    if (!['ready_for_review', 'in_progress'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // 1. Verify Token
    const tokenResult = verifyIntakeToken(token);
    if (!tokenResult.ok) {
        return res.status(401).json({ error: 'Invalid or expired token', details: tokenResult.error });
    }
    const { intake_id, firm_id } = tokenResult.payload;

    // 2. Update Status
    const { error: updateError } = await supabaseAdmin
        .from('intakes')
        .update({ status })
        .eq('id', intake_id)
        .eq('firm_id', firm_id)
        .neq('status', 'submitted'); // Prevent un-submitting

    if (updateError) {
        return res.status(500).json({ error: 'Failed to update status', details: updateError.message });
    }

    return res.status(200).json({ ok: true });
}
