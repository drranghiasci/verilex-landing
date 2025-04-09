// supabase/functions/send-confirmation-email/index.ts

import { createServer } from "http";
import { Resend } from "resend"; // Updated import statement

const resend = new Resend(process.env.RESEND_API_KEY); // Use process.env for Node.js

const server = createServer(async (req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { name, email } = JSON.parse(body);

        const { data, error } = await resend.emails.send({
          from: "VeriLex AI <founder@verilex.us>",
          to: email,
          subject: "Welcome to the VeriLex AI Waitlist",
          html: `
            <div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: auto;">
              <h2 style="color: #1A202C;">👋 Welcome, ${name || "there"}!</h2>
              <p>Thanks for signing up for the VeriLex AI waitlist.</p>
              <p>We’ll be in touch soon with early access, updates, and more.</p>
              <hr style="margin: 24px 0;" />
              <p style="font-size: 14px; color: #718096;">🧠 The VeriLex AI Team</p>
            </div>
          `,
        });

        if (error) {
          console.error("Resend error:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data }));
      } catch (err) {
        console.error("Function error:", err);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

// Start the server on a specific port
server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
