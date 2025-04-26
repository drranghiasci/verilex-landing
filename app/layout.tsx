// app/layout.tsx
import '@styles/globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import '@/styles/landing-bg.css';


export const metadata: Metadata = {
  title: 'VeriLex AI',
  description: 'AI-powered legal software for solo and small firms',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `class` is added by ThemeProvider */}
      <body className="antialiased">
        {/* ---------- client providers ---------- */}
        <ThemeProvider attribute="class" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
