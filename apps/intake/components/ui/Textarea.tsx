import type { TextareaHTMLAttributes } from 'react';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export default function Textarea({
  invalid = false,
  unstyled = false,
  className = '',
  ...props
}: TextareaProps) {
  const baseClass = unstyled ? '' : `input${invalid ? ' input--invalid' : ''}`;
  const classes = `${baseClass} ${className}`.trim();
  return <textarea className={classes} {...props} />;
}
