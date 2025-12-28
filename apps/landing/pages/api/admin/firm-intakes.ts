import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdminClient';

const ADMIN_TOKEN = process.env.ADMIN_DASH_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_TOKEN || req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const statusQuery = req.query.status;
  const statuses =
    typeof statusQuery === 'string' && statusQuery.trim().length > 0
      ? statusQuery.split(',').map((s) => s.trim())
      : ['new', 'reviewing'];

  const { data, error } = await supabaseAdmin
    .from('firm_intakes')
    .select('id, firm_name, admin_email, office_state, office_county, status, created_at, team_size_estimate')
    .in('status', statuses)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ rows: data ?? [] });
}
