import { type ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeVariant = 'default' | 'accent' | 'danger' | 'muted';

const VARIANT: Record<BadgeVariant, string> = {
  default: 'bg-bg-hover text-text-muted',
  accent:  'bg-accent/15 text-accent',
  danger:  'bg-danger/10 text-danger',
  muted:   'bg-bg-input text-text-dim',
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}

export function Badge({ children, variant = 'default', className, onClick, title, disabled }: BadgeProps) {
  return (
    <span
      title={title}
      onClick={!disabled ? onClick : undefined}
      className={clsx(
        'text-[10px] px-1.5 py-0.5 rounded-full font-medium select-none',
        VARIANT[variant],
        onClick && !disabled ? 'cursor-pointer' : 'cursor-default',
        disabled && 'opacity-40 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </span>
  );
}
