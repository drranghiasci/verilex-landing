import type { NextApiRequest, NextApiResponse } from 'next';

type FirmIntakePayload = {
  firmName: string;
  monthlyMatters: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  attorneyUsers: string;
  staffUsers: string;
  cms: string;
};

type ErrorResponse = { message: string };
type SuccessResponse = { status: 'success' };

export default function handler(req: NextApiRequest, res: NextApiResponse<SuccessResponse | ErrorResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const body = req.body as Partial<FirmIntakePayload>;
  const requiredFields: (keyof FirmIntakePayload)[] = [
    'firmName',
    'monthlyMatters',
    'adminName',
    'adminEmail',
    'adminPhone',
    'attorneyUsers',
    'staffUsers',
    'cms',
  ];

  const missing = requiredFields.filter((field) => !body[field]);
  if (missing.length > 0) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
  }

  try {
    // Placeholder for actual integration (e.g., CRM, database, or email).
    // eslint-disable-next-line no-console
    console.log('Received firm intake submission:', body);
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Firm intake handler failed:', error);
    return res.status(500).json({ message: 'Unable to process intake at this time.' });
  }
}
