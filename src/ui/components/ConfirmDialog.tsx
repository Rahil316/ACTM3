import { type ReactNode } from 'react';
import clsx from 'clsx';
import { ConfirmOverlay } from './Modal';
import { Button } from './Button';
import { IconAlertTriangle } from './icons';
import { ModalTitle, BodyText } from './typography';

interface ConfirmDialogProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'danger-solid';
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

// Destructive-action confirm dialog — warning icon + title + body + confirm/cancel buttons.
// Used for: confirm import (overwrites config), confirm clear (wipes all data).
export function ConfirmDialog({
  open,
  icon,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger-solid',
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  return (
    <ConfirmOverlay open={open} className={className}>
      <div className="text-danger">
        {icon ?? <IconAlertTriangle />}
      </div>
      <div className="space-y-2">
        <ModalTitle>{title}</ModalTitle>
        {body && <BodyText className="max-w-[260px]">{body}</BodyText>}
      </div>
      <div className={clsx('flex gap-3 w-full max-w-[280px]')}>
        <Button variant="secondary" size="xl" label={cancelLabel} onClick={onCancel} className="flex-1" />
        <Button variant={confirmVariant} size="xl" label={confirmLabel} onClick={onConfirm} className="flex-1" />
      </div>
    </ConfirmOverlay>
  );
}
