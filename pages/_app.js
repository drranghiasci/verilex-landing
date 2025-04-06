import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const hideNavOn = ['/dashboard', '/new-case', '/active-cases', '/settings'];
  const shouldShowNav = !hideNavOn.includes(router.pathname);

  return (
    <>
      {shouldShowNav && <NavBar />}
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
