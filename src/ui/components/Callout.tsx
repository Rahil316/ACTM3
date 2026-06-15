import { type ReactNode } from 'react';
import clsx from 'clsx';

type CalloutVariant = 'warning' | 'info' | 'success' | 'danger';

const STYLES: Record<CalloutVariant, string> = {
  warning: 'border-w-br-default bg-w-fi-subtle',
  info:    'border-n-br-default bg-n-sf-input',
  success: 'border-s-br-default bg-s-fi-subtle',
  danger:  'border-d-br-default bg-d-fi-subtle',
};

const TITLE_STYLES: Record<CalloutVariant, string> = {
  warning: 'text-w-tx-muted',
  info:    'text-n-tx-primary',
  success: 'text-s-tx-muted',
  danger:  'text-d-tx-muted',
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
      <span className="text-[11px] text-n-tx-muted">{children}</span>
    </div>
  );
}
