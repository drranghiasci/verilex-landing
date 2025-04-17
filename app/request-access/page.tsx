export default function RequestAccess() {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold">Beta Access Required</h1>
          <p>
            This part of VeriLex AI is currently limited to invited testers.
            If you&#39;d like early access, please{' '}
            <a href="mailto:founder@verilex.us" className="text-blue-600 underline">
              contact us
            </a>{' '}
            or join the waitlist.
          </p>
        </div>
      </div>
    );
  }
  