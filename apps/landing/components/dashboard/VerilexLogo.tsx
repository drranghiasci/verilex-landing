import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function VerilexLogo({ className = '', ...props }) {
  const [src, setSrc] = useState('/verilex-logo-name-lightmode.png'); // light mode default

  useEffect(() => {
    const updateLogo = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setSrc(isDark ? '/verilex-logo-name-darkmode.png' : '/verilex-logo-name-lightmode.png');
    };

    updateLogo();

    const observer = new MutationObserver(updateLogo);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <Image
      priority
      src={src}
      alt="VeriLex AI"
      width={130}
      height={28}
      className={className}
      {...props}
    />
  );
}
