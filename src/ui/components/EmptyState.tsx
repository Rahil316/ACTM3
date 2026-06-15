import { type ReactNode } from 'react';
import clsx from 'clsx';
import { CardTitle, HelperText } from './typography';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// Centered empty-state card: icon + title + optional description + optional action button.
// Used when lists are empty: no versions, no colors in direct mode, no roles, etc.
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={clsx('settings-card flex flex-col items-center gap-3 py-6 text-center', className)}>
      <div className="w-10 h-10 rounded-xl bg-n-sf-input flex items-center justify-center text-n-tx-muted text-[18px]">
        {icon}
      </div>
      <div className="space-y-1">
        <CardTitle>{title}</CardTitle>
        {description && <HelperText className="max-w-[220px]">{description}</HelperText>}
      </div>
      {action}
    </div>
  );
}
