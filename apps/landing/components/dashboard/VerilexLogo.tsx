import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTheme } from '@/lib/theme-context';

export default function VerilexLogo({ className = '', ...props }: { className?: string }) {
  const { theme } = useTheme();
  const [src, setSrc] = useState('/verilex-logo-name-lightmode.png');

  useEffect(() => {
    setSrc(theme === 'dark' ? '/verilex-logo-name-darkmode.png' : '/verilex-logo-name-lightmode.png');
  }, [theme]);

  return (
    <Image
      priority
      src={src}
      alt="VeriLex AI"
      width={150}
      height={46}
      className={className}
      {...props}
    />
  );
}
