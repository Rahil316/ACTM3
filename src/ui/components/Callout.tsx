import { type ReactNode } from 'react';
import clsx from 'clsx';
import { IconInfo, IconCheckCircle, IconAlertTriangle, IconAlertCircle } from './icons';

export type CalloutVariant = 'warning' | 'info' | 'success' | 'danger';

const CONTAINER: Record<CalloutVariant, string> = {
  warning: 'border-w-br-default bg-w-fi-subtle',
  info:    'border-n-br-default bg-n-sf-input',
  success: 'border-s-br-default bg-s-fi-subtle',
  danger:  'border-d-br-default bg-d-fi-subtle',
};

const ICON_COLOR: Record<CalloutVariant, string> = {
  warning: 'text-w-tx-muted',
  info:    'text-n-tx-secondary',
  success: 'text-s-tx-muted',
  danger:  'text-d-tx-muted',
};

const TITLE_COLOR: Record<CalloutVariant, string> = {
  warning: 'text-w-tx-muted',
  info:    'text-n-tx-primary',
  success: 'text-s-tx-muted',
  danger:  'text-d-tx-muted',
};

const ACTION_COLOR: Record<CalloutVariant, string> = {
  warning: 'text-w-tx-muted hover:text-w-tx-strong',
  info:    'text-n-tx-secondary hover:text-n-tx-primary',
  success: 'text-s-tx-muted hover:text-s-tx-strong',
  danger:  'text-d-tx-muted hover:text-d-tx-strong',
};

const DEFAULT_ICON: Record<CalloutVariant, ReactNode> = {
  warning: <IconAlertTriangle className="w-3.5 h-3.5 shrink-0" />,
  info:    <IconInfo className="w-3.5 h-3.5 shrink-0" />,
  success: <IconCheckCircle className="w-3.5 h-3.5 shrink-0" />,
  danger:  <IconAlertCircle className="w-3.5 h-3.5 shrink-0" />,
};

interface CalloutProps {
  variant?: CalloutVariant;
  title?: ReactNode;
  icon?: ReactNode | false;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
  className?: string;
}

export function Callout({ variant = 'info', title, icon, action, children, className }: CalloutProps) {
  const resolvedIcon = icon === false ? null : (icon ?? DEFAULT_ICON[variant]);

  return (
    <div className={clsx('rounded-[8px] border px-3 py-2.5 flex flex-col gap-1', CONTAINER[variant], className)}>
      {/* Title row */}
      {(title || resolvedIcon || action) && (
        <div className="flex items-start gap-1.5">
          {resolvedIcon && (
            <span className={clsx('mt-px', ICON_COLOR[variant])}>{resolvedIcon}</span>
          )}
          {title && (
            <span className={clsx('flex-1 text-[11px] font-semibold leading-snug', TITLE_COLOR[variant])}>
              {title}
            </span>
          )}
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={clsx('shrink-0 text-[11px] font-semibold underline-offset-2 hover:underline transition-colors cursor-pointer', ACTION_COLOR[variant])}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
      {/* Body */}
      {children && (
        <span className={clsx('text-[11px] leading-snug', resolvedIcon ? 'pl-5' : '', 'text-n-tx-muted')}>
          {children}
        </span>
      )}
    </div>
  );
}
