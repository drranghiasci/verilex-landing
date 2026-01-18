
import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '../lib/theme-context';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
    return (
        <ThemeProvider>
            <main className={inter.className}>
                <Component {...pageProps} />
            </main>
        </ThemeProvider>
    );
}
