import type { AppProps } from 'next/app';
import '@styles/globals.css';
import { ThemeProvider } from '@/lib/theme-context';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-black text-[color:var(--text-0)]">
        <Component {...pageProps} />
      </div>
    </ThemeProvider>
  );
}
