import { type ReactNode } from 'react';
import { LucideClose as X } from './icons';
import { Button } from './Button';
import { Backdrop } from './Backdrop';
import { Sheet } from './Sheet';
import { FieldLabel } from './typography';

// ── MenuHeader ────────────────────────────────────────────────────────────────

interface MenuHeaderProps {
  label: string;
  action?: ReactNode;
  onClose?: () => void;
}

export function MenuHeader({ label, action, onClose }: MenuHeaderProps) {
  return (
    <div className="px-4 py-3 border-b border-n-br-subtle flex items-center justify-between shrink-0">
      <FieldLabel className="m-0 p-0">{label}</FieldLabel>
      {action ?? (onClose && (
        <Button variant="icon" size="xs" icon={<X size={13} strokeWidth={2} />} onClick={onClose} />
      ))}
    </div>
  );
}

// ── MenuRow ───────────────────────────────────────────────────────────────────

interface MenuRowProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

export function MenuRow({ onClick, children, className }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-4 py-2.5 w-full text-left',
        'hover:bg-n-sf-hover transition-colors cursor-pointer',
        'border-b border-n-br-subtle last:border-0',
        className ?? '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── SuggestSheet ──────────────────────────────────────────────────────────────
// Generic backdrop + Sheet wrapper for suggest/picker overlays.

interface SuggestSheetProps {
  label: string;
  linkLabel?: string;
  onLink?: () => void;
  onClose: () => void;
  empty?: ReactNode;
  children: ReactNode;
}

export function SuggestSheet({ label, linkLabel, onLink, onClose, empty, children }: SuggestSheetProps) {
  return (
    <>
      <Backdrop open onClick={onClose} className="fixed z-40" />
      <div className="fixed inset-0 z-40 pointer-events-none" onClick={onClose}>
        <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <Sheet open className="overflow-y-auto">
            <MenuHeader
              label={label}
              action={onLink && linkLabel ? (
                <Button variant="underlined" size="xs" label={linkLabel} onClick={onLink} />
              ) : undefined}
            />
            {empty ?? <div className="flex flex-col overflow-y-auto">{children}</div>}
          </Sheet>
        </div>
      </div>
    </>
  );
}
