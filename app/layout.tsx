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
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
  className="min-h-screen scroll-smooth antialiased 
             bg-gradient-to-br from-black via-[#0a0014] to-[#190033] 
             text-white bg-fixed"
>
        <ThemeProvider attribute="class" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
