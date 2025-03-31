import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  const { email, name } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'VeriLex AI <founder@verilex.us>',
      to: email,
      subject: 'Welcome to the VeriLex AI Waitlist',
      html: `
        <h2>Hi ${name}, you're on the list! ✅</h2>
        <p>Thanks for signing up for the VeriLex AI waitlist. We'll be in touch soon with early access, updates, and more.</p>
        <p style="font-size: 14px; color: #718096;">— The VeriLex AI Team</p>
      `,
    });

    if (error) {
      console.error('Email send error:', error);
      return res.status(500).json({ error: 'Failed to send confirmation email' });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
