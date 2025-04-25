// app/layout.tsx (Global Minimal)
'use client';

import '@styles/globals.css';
import React from 'react';
import { supabase } from '@/lib/supabaseClient';
import { ThemeProvider } from 'next-themes';

console.log('Root layout rendering: no session check here!');
// Removed duplicate RootLayout definition
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" enableSystem>
          {children}
        </ThemeProvider>
        </body>
      </html>
    );
  }
