import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { error } = await supabase.from('waitlist').insert([{ email }]);
    if (error) throw error;
    return res.status(200).json({ message: 'Success' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
