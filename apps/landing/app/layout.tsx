// app/layout.tsx
import '@styles/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'VeriLex AI',
  description: 'AI-powered legal software for solo and small firms',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={[
          'min-h-screen scroll-smooth antialiased bg-fixed',
          'text-[color:var(--text-0)]',
          'bg-gradient-to-br from-[var(--g1)] via-[var(--g2)] to-[var(--g3)]',
        ].join(' ')}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
