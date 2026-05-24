import { type ReactNode } from 'react';
import clsx from 'clsx';

interface SheetProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

// Bottom sheet overlay. Slides up from the bottom when open=true.
// Position and backdrop must be provided by the parent (typically absolute inset-0 container).
export function Sheet({ open, children, className }: SheetProps) {
  return (
    <div
      className={clsx(
        'bottom-sheet absolute bottom-0 left-0 right-0 bg-bg-panel rounded-t-[16px] border-t border-border-base z-30 max-h-[90%] flex flex-col',
        open && 'open',
        className,
      )}
      // inert when closed so keyboard/focus doesn't leak into hidden sheet
      {...(!open ? { inert: '' } : {})}
    >
      {children}
    </div>
  );
}
