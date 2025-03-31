import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  try {
    const { email, name } = await req.json();

    const { data, error } = await resend.emails.send({
      from: "VeriLex AI <founder@verilex.us>",
      to: [email],
      subject: "Welcome to the VeriLex AI Waitlist",
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
          <h2 style="color: #1A202C;">👋 Welcome, ${name}!</h2>
          <p>Thanks for signing up for the VeriLex AI waitlist. We’re excited to bring legal automation to solo attorneys and small firms.</p>
          <p>We’ll be in touch soon with early access, updates, and more.</p>
          <hr style="margin: 24px 0;" />
          <p style="font-size: 14px; color: #718096;">🧠 The VeriLex AI Team</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
