import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function VerilexLogo({ className = '', ...props }) {
  const { theme, resolvedTheme } = useTheme();
  const mode = theme === 'system' ? resolvedTheme : theme;
  const src =
    mode === 'dark'
      ? '/verilex-logo-name-darkmode.png'
      : '/verilex-logo-name-lightmode.png';

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
