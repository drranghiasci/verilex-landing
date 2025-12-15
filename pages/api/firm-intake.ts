import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Placeholder for actual integration (e.g., CRM, database, or email).
  // eslint-disable-next-line no-console
  console.log('Received firm intake submission:', req.body);

  return res.status(200).json({ status: 'success' });
}
