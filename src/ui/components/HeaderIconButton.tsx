import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

interface HeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

// 40px rounded-full icon button for the app header toolbar.
// Used for: More, Import, Save Version, Settings, and the Run button area.
export function HeaderIconButton({ children, className, ...rest }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'bg-bg-input hover:bg-bg-hover w-10 h-10',
        'flex items-center justify-center rounded-full',
        'transition-colors text-text-primary cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
