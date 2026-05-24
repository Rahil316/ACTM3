import { type ReactNode } from 'react';
import clsx from 'clsx';

interface ActionCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  actions?: ReactNode;
  leading?: ReactNode;
  className?: string;
  onClick?: () => void;
}

// Card with a truncated title + optional subtitle/meta text on the left,
// and an optional action button group on the right.
// Used in: versions list (project screen), token export items.
export function ActionCard({ title, subtitle, meta, actions, leading, className, onClick }: ActionCardProps) {
  return (
    <div
      className={clsx(
        'settings-card flex items-start justify-between gap-3',
        onClick && 'cursor-pointer hover:bg-bg-hover transition-colors',
        className,
      )}
      onClick={onClick}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
        {meta && <p className="text-[10px] text-text-dim mt-1">{meta}</p>}
      </div>
      {actions && <div className="flex gap-1 shrink-0">{actions}</div>}
    </div>
  );
}
