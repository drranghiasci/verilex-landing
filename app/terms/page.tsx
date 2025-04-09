export default function TermsPage() {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-sm text-gray-500 mb-8">Effective Date: April 9, 2025</p>
  
        <div className="space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">1. About VeriLex AI</h2>
            <p>
              VeriLex AI is a secure, AI-powered legal workflow platform built for solo attorneys and small firms. We provide tools to streamline client intake, manage case data, and automate legal documentation — beginning with divorce and family law, with plans to expand to other areas of practice.
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>AI-powered Client Intake Forms</li>
              <li>Active Cases Dashboard with filters</li>
              <li>Individual Case Views with uploads, notes, and export tools</li>
              <li>Mobile-optimized responsive design</li>
              <li>Print-ready PDFs, court countdowns, and more</li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">2. Eligibility & Account Registration</h2>
            <p>
              To use VeriLex AI, you must:
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>Be at least 18 years old</li>
              <li>Be a licensed attorney or authorized representative of a legal practice</li>
              <li>Provide complete and accurate registration information</li>
              <li>Maintain the confidentiality of your login credentials</li>
            </ul>
            <p className="mt-2">
              You are responsible for all activity under your account. Please notify us immediately at <a href="mailto:founder@verilex.us" className="underline text-blue-600">founder@verilex.us</a> of any unauthorized use.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">3. Permitted Use</h2>
            <p>
              You may use VeriLex AI solely for lawful purposes related to legal case management within your practice.
            </p>
            <p className="mt-2">You agree <strong>not</strong> to:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Use the platform for unauthorized or unethical legal practice</li>
              <li>Upload false, harmful, or infringing content</li>
              <li>Use bots, scrapers, or other unauthorized automation tools</li>
              <li>Attempt to disrupt, reverse engineer, or compromise the platform</li>
            </ul>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">4. Data & Confidentiality</h2>
            <p>
              While VeriLex AI is not a law firm and does not offer legal advice, we use encryption, secure databases, and limited-access controls to safeguard uploaded data.
            </p>
            <p className="mt-2">
              You are solely responsible for ensuring that all data shared through VeriLex AI complies with applicable privacy, confidentiality, and ethics rules in your jurisdiction.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">5. Beta Access & Waitlist</h2>
            <p>
              If you are participating in our Beta Program, you acknowledge that the software may be incomplete, unstable, or subject to change. We may contact you for feedback and reserve the right to limit or revoke access at any time.
            </p>
            <p className="mt-2">
              Beta participation does not guarantee future access to paid features but may include early discounts or perks at our discretion.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
            <p>
              All platform code, designs, branding, and content (excluding user content) are the intellectual property of VeriLex AI, LLC. You may not copy, reuse, or redistribute any aspect of the platform without express written permission.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">7. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access at any time, without notice, if:
            </p>
            <ul className="list-disc list-inside mt-2">
              <li>You breach these Terms</li>
              <li>Your use poses risk to the platform or other users</li>
              <li>We discontinue the Service</li>
            </ul>
            <p className="mt-2">
              Upon termination, all rights granted to you under these Terms will immediately cease.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">8. Disclaimers</h2>
            <p>
              VeriLex AI does <strong>not</strong> provide legal advice. We are a technology platform only. Any legal decisions made using our software are your responsibility.
            </p>
            <p className="mt-2">
              The Service is provided “as is” and “as available” without warranties of any kind.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, VeriLex AI will not be liable for indirect, incidental, special, or consequential damages, including lost profits or data, arising from your use of the Service.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">10. Changes to the Terms</h2>
            <p>
              We may update these Terms periodically. If changes are material, we will notify you by email or in-app notice. Continued use of the platform after changes means you accept the updated Terms.
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of [Insert State]. Any legal actions must be brought in the courts of [Insert County], [Insert State].
            </p>
          </section>
  
          <section>
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p>
              If you have any questions or concerns about these Terms, please contact us:
            </p>
            <p className="mt-2">
              <strong>VeriLex AI, LLC</strong><br />
              Email: <a href="mailto:founder@verilex.us" className="underline text-blue-600">founder@verilex.us</a><br />
              Legal address: To be provided
            </p>
          </section>
        </div>
      </div>
    );
  }
  