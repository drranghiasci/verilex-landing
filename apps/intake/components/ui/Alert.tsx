import type { HTMLAttributes } from 'react';

type AlertVariant = 'error' | 'success' | 'info';

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

const VARIANT_CLASS: Record<AlertVariant, string> = {
  error: 'error',
  success: 'success',
  info: 'info',
};

export default function Alert({ variant = 'info', className = '', ...props }: AlertProps) {
  const variantClass = VARIANT_CLASS[variant];
  const classes = `banner ${variantClass} ${className}`.trim();
  return <div className={classes} {...props} />;
}
