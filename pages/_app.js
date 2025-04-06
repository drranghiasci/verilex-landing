// pages/_app.js

import '@/styles/globals.css'; // if you're using a global stylesheet
import { Analytics } from '@vercel/analytics/react';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
