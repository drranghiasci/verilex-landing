import { Head, Html, Main, NextScript } from 'next/document';

// Inline script to set dark mode before React hydrates (prevents white flash)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('intake-theme');
    var theme = stored || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en" className="dark">
      <Head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <body>
        {/* Script runs before React hydrates to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
