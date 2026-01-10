import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'unstyled';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'primary',
  secondary: 'secondary',
  unstyled: '',
};

export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = VARIANT_CLASS[variant];
  const classes = `${variantClass} ${className}`.trim();
  return <button type={type} className={classes} {...props} />;
}
