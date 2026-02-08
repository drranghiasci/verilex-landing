// app/layout.tsx
import '@styles/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'VeriLex — Legal intake and case infrastructure',
  description: 'Structured legal intake, case review, and client interaction for modern law firms.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="min-h-screen scroll-smooth antialiased bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
