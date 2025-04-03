// pages/_app.js
import '../styles/globals.css';
import NavBar from '../components/NavBar';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <NavBar />
      <div className="pt-16"> {/* padding for fixed nav */}
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default MyApp;
