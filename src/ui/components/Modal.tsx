import { type ReactNode } from 'react';
import clsx from 'clsx';
import { ModalTitle, Subtitle } from './typography';

// Z-index layers match vanilla stacking order:
//   settings overlay  z-40
//   run-dialog        z-60
//   confirm overlays  z-60
//   quick-start       z-50
//   design-lab        z-50

export type ModalLayer = 'base' | 'dialog' | 'confirm' | 'overlay';

const LAYER: Record<ModalLayer, string> = {
  base: 'z-40',
  dialog: 'z-[60]',
  confirm: 'z-[60]',
  overlay: 'z-50',
};

interface ModalProps {
  open: boolean;
  layer?: ModalLayer;
  children: ReactNode;
  className?: string;
}

// Full-screen overlay that covers the entire plugin iframe.
// Use for settings, run-dialog, quick-start, theme-shop, confirm dialogs.
// Children are responsible for their own layout (flex-col, scroll, etc.).
export function Modal({ open, layer = 'base', children, className }: ModalProps) {
  if (!open) return null;
  return <div className={clsx('absolute inset-0 flex flex-col bg-bg-app', LAYER[layer], className)}>{children}</div>;
}

// Frosted confirm overlay — semi-transparent backdrop with centered content.
// Used for confirm-import and confirm-clear overlays.
export function ConfirmOverlay({ open, children, className }: ModalProps) {
  if (!open) return null;
  return (
    <div
      className={clsx(
        'absolute inset-0 bg-bg-app/95 backdrop-blur-sm z-[60]',
        'flex items-center justify-center p-6 text-center flex-col gap-6',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Standard modal header bar: title left, action buttons right.
interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function ModalHeader({ title, subtitle, actions, className }: ModalHeaderProps) {
  return (
    <div
      className={clsx('shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-base', className)}
    >
      <div>
        <ModalTitle>{title}</ModalTitle>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
