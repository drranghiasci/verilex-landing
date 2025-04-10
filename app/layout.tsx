// app/layout.tsx (Global Minimal)
'use client';

import '@/styles/globals.css'; // correct path to your CSS
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
