// app/layout.tsx (Global Minimal)
console.log('Root layout rendering: no session check here!');
'use client';

import '@styles/globals.css';
import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
