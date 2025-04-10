// app/layout.tsx (Global Minimal)
'use client';

import '@styles/globals.css';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';

console.log('Root layout rendering: no session check here!');
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
