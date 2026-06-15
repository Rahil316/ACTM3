import { type ReactNode } from 'react';
import clsx from 'clsx';
import { CardTitle, Subtitle } from './typography';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function ScreenHeader({ title, subtitle, actions, className }: ScreenHeaderProps) {
  return (
    <div className={clsx('shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-n-br-default bg-n-bg-app', className)}>
      {(title || subtitle) && (
        <div className="flex flex-col justify-center min-w-0">
          {title && <CardTitle>{title}</CardTitle>}
          {subtitle && <Subtitle>{subtitle}</Subtitle>}
        </div>
      )}
      {actions && <div className="flex items-center gap-2 shrink-0 ml-2">{actions}</div>}
    </div>
  );
}
