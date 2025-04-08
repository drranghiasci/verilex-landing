// app/layout.tsx
import '../styles/globals.css';
import React from 'react';

export const metadata = {
  title: 'VeriLex AI',
  description: 'Legal Intelligence Platform for Modern Law Firms',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body 
        suppressHydrationWarning
      className="bg-gradient-to-br from-white to-slate-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}
