import { type ReactNode } from 'react';
import clsx from 'clsx';

type CalloutVariant = 'warning' | 'info' | 'success' | 'danger';

const STYLES: Record<CalloutVariant, string> = {
  warning: 'border-warning/40 bg-warning-subtle',
  info:    'border-border-base bg-bg-input',
  success: 'border-success/40 bg-success-subtle',
  danger:  'border-danger/40 bg-danger-subtle',
};

const TITLE_STYLES: Record<CalloutVariant, string> = {
  warning: 'text-warning',
  info:    'text-text-primary',
  success: 'text-success',
  danger:  'text-danger',
};

interface CalloutProps {
  variant?: CalloutVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Callout({ variant = 'info', title, children, className }: CalloutProps) {
  return (
    <div className={clsx('rounded-[8px] border px-3 py-2.5 flex flex-col gap-1', STYLES[variant], className)}>
      {title && (
        <span className={clsx('text-[11px] font-semibold', TITLE_STYLES[variant])}>{title}</span>
      )}
      <span className="text-[11px] text-text-muted">{children}</span>
    </div>
  );
}
