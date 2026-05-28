import { type ReactNode } from 'react';
import clsx from 'clsx';

interface SelectableCardProps {
  onClick: () => void;
  selected?: boolean;
  children: ReactNode;
  className?: string;
}

export function SelectableCard({ onClick, selected, children, className }: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'text-left w-full bg-bg-card border rounded-[10px] p-3 transition-colors',
        selected
          ? 'border-accent bg-accent-subtle'
          : 'border-border-base hover:bg-bg-hover hover:border-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}
