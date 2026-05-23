import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Button, type ButtonVariant } from './Button';
import { Sheet } from './Sheet';
import { ConfirmOverlay } from './Modal';

export interface DialogueButton {
  label: string;
  variant?: ButtonVariant;
  id?: string;
  action?: () => void;
}

interface DialogueProps {
  open: boolean;
  title: string;
  body?: string;
  icon?: ReactNode;
  buttons?: DialogueButton[];
  layout?: 'row' | 'stacked' | 'bottom-sheet';
  onClose?: () => void;
}

// Universal dialogue component matching vanilla createDialogue().
// Three layouts:
//   row          — title + buttons side-by-side in a compact floating card
//   stacked      — centred card, icon + title + full-width buttons vertically
//   bottom-sheet — slides up from bottom, drag handle, vertical buttons
export function Dialogue({ open, title, body, icon, buttons = [], layout = 'row', onClose }: DialogueProps) {
  if (!open) return null;

  const mkBtn = (btn: DialogueButton, fullWidth: boolean, size: 'lg' | 'xl') => (
    <Button
      key={btn.label}
      id={btn.id}
      variant={btn.variant ?? 'secondary'}
      size={size}
      label={btn.label}
      className={fullWidth ? 'w-full' : 'flex-1'}
      onClick={() => { onClose?.(); btn.action?.(); }}
    />
  );

  // ── Bottom-sheet layout ──────────────────────────────────────────────────
  if (layout === 'bottom-sheet') {
    return (
      <Sheet open={open} className="z-[65]">
        <div className="flex flex-col">
          {/* drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full bg-border-base" />
          </div>
          {/* header */}
          <div className="px-5 pt-3 pb-4 border-b border-border-base">
            {icon && <div className="mb-3">{icon}</div>}
            <h2 className="text-[17px] font-bold text-text-primary">{title}</h2>
            {body && <p className="text-[12px] text-text-muted leading-relaxed mt-1">{body}</p>}
          </div>
          {/* buttons */}
          <div className="p-4 space-y-2">
            {buttons.map((btn) => mkBtn(btn, true, 'xl'))}
          </div>
        </div>
      </Sheet>
    );
  }

  // ── Stacked + row layouts (floating card) ────────────────────────────────
  const isStacked = layout === 'stacked';
  const card = (
    <div className="bg-bg-card rounded-[14px] border border-border-base shadow-xl w-full max-w-[320px]">
      {isStacked ? (
        <div className="flex flex-col items-center gap-5 p-6 text-center">
          {icon}
          <div className="space-y-2 w-full">
            <h2 className="text-[17px] font-bold text-text-primary">{title}</h2>
            {body && <p className="text-[12px] text-text-muted leading-relaxed">{body}</p>}
          </div>
          <div className={clsx('w-full space-y-3')}>
            {buttons.map((btn) => mkBtn(btn, true, 'xl'))}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <p className="text-[15px] font-semibold text-text-primary text-left">{title}</p>
          {body && <p className="text-[12px] text-text-muted leading-relaxed text-left">{body}</p>}
          <div className="flex gap-2 w-full">
            {buttons.map((btn) => mkBtn(btn, false, 'lg'))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <ConfirmOverlay open={open}>
      {card}
    </ConfirmOverlay>
  );
}
