'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** How long the consent is valid (days) */
const CONSENT_LIFETIME = 365;
const LOCAL_KEY        = 'verilex_cookie_consent';

function setConsentCookie(value: 'accepted' | 'declined') {
  const expires = new Date();
  expires.setDate(expires.getDate() + CONSENT_LIFETIME);
  document.cookie = `cookie_consent=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

export default function CookieBanner() {
  const [status, setStatus] = useState<'accepted' | 'declined' | null>(null);

  useEffect(() => {
    // 1. Read from localStorage
    const stored = localStorage.getItem(LOCAL_KEY) as 'accepted' | 'declined' | null;
    if (stored) setStatus(stored);
    // 2. Fallback to cookie (SSR can hydrate from this too)
    if (!stored && typeof document !== 'undefined') {
      const match = document.cookie.match(/cookie_consent=(accepted|declined)/);
      if (match?.[1]) setStatus(match[1] as 'accepted' | 'declined');
    }
  }, []);

  // ----------------------------------------------------
  // When user clicks Accept / Decline
  // ----------------------------------------------------
  const handleChoice = (choice: 'accepted' | 'declined') => {
    localStorage.setItem(LOCAL_KEY, choice);
    setConsentCookie(choice);
    setStatus(choice);

    if (choice === 'accepted') {
      // TODO: initialise analytics / tag‑managers here
      // Example: window.gtag('consent', 'update', { ad_storage: 'granted' });
    }
  };

  // Banner hidden once a choice is stored
  if (status) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-t border-gray-300 shadow-lg"
    >
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-800">
        <p className="leading-snug grow">
          We use cookies to enhance site navigation, analyse usage, and improve your experience. 
          Read our{' '}
          <Link
            href="/privacy"
            className="underline decoration-1 underline-offset-2 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <div className="shrink-0 flex gap-2">
          <button
            onClick={() => handleChoice('declined')}
            className="px-4 py-2 rounded border border-gray-400 text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
          >
            Decline
          </button>
          <button
            onClick={async () => {
              const { inject } = await import('@vercel/analytics');
              inject();
              handleChoice('accepted');
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
