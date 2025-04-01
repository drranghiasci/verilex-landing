import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function handler(req, res) {
  const { email, name } = req.body;

  try {
    const { data, error } = await resend.emails.send({
      from: 'VeriLex AI <founder@verilex.us>',
      to: email,
      subject: 'Welcome to the VeriLex AI Waitlist',
      html: `
        <div style="font-family: 'Helvetica Neue', sans-serif; padding: 40px; background: #f9fafb; color: #1a202c; line-height: 1.6;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <div style="background: #1a202c; padding: 30px; text-align: center;">
              <img src="https://verilex.us/verilex-logo-name.png" alt="VeriLex AI Logo" style="max-width: 250px; height: auto;" />
            </div>
            <div style="padding: 30px;">
              <h2 style="margin-bottom: 20px;">Welcome to the Future of Legal Automation, ${name} 🚀</h2>
              <p>You're officially on the VeriLex AI waitlist. We’re thrilled to have you on board.</p>

              <p style="margin-top: 20px;">Here’s what you can expect:</p>
              <ul style="padding-left: 20px;">
                <li>⚡ AI-powered legal research & summarization</li>
                <li>🧾 Instant contract review with risk detection</li>
                <li>🧠 Smart intake bots for client onboarding</li>
                <li>🗓️ Public launch: <strong>October 1, 2025</strong></li>
              </ul>

              <p style="margin-top: 30px; font-size: 1.1rem;"><strong>You're early — and that matters.</strong> We’ll be sending you early access, product updates, and a chance to test features before the public.</p>

              <div style="margin-top: 40px; text-align: center;">
                <a href="https://verilex.us" style="background: #1a202c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Visit Our Site</a>
              </div>

              <p style="margin-top: 50px; font-style: italic; color: #4b5563;">
                Thank you for joining us on this journey and for placing your trust in VeriLex AI.
              </p>
              <p style="margin-top: 10px;">
                — The VeriLex AI Team
              </p>
            </div>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
              VeriLex AI is not a law firm and does not provide legal advice.<br />
              Questions? Reach us at <a href="mailto:founder@verilex.us" style="color: #3b82f6;">founder@verilex.us</a>
            </div>
          </div>
        </div>
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

export default handler;
