import type { InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export default function Input({
  invalid = false,
  unstyled = false,
  className = '',
  ...props
}: InputProps) {
  const baseClass = unstyled ? '' : `input${invalid ? ' input--invalid' : ''}`;
  const classes = `${baseClass} ${className}`.trim();
  return <input className={classes} {...props} />;
}
