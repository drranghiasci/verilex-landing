import type { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className = '', ...props }: CardProps) {
  const classes = `card ${className}`.trim();
  return <div className={classes} {...props} />;
}
