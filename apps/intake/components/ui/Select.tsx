import type { SelectHTMLAttributes } from 'react';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export default function Select({
  invalid = false,
  unstyled = false,
  className = '',
  ...props
}: SelectProps) {
  const baseClass = unstyled ? '' : `input${invalid ? ' input--invalid' : ''}`;
  const classes = `${baseClass} ${className}`.trim();
  return <select className={classes} {...props} />;
}
