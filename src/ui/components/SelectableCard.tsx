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
        'text-left w-full bg-n-sf-default border rounded-[10px] p-3 transition-colors',
        selected
          ? 'border-b-br-default bg-b-fi-subtle'
          : 'border-n-br-default hover:bg-n-sf-hover hover:border-b-br-default',
        className,
      )}
    >
      {children}
    </button>
  );
}
