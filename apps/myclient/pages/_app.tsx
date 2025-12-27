import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import { FirmProvider } from '@/lib/FirmProvider';
import MyClientShell from '@/components/MyClientShell';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isMyClientRoute = router.pathname.startsWith('/myclient');

  if (isMyClientRoute) {
    return (
      <FirmProvider>
        <MyClientShell>
          <Component {...pageProps} />
        </MyClientShell>
      </FirmProvider>
    );
  }

  return <Component {...pageProps} />;
}
