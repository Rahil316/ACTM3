import clsx from 'clsx';

interface BackdropProps {
  open: boolean;
  onClick?: () => void;
  className?: string;
}

// Semi-transparent blurred backdrop that sits behind sheets and modal dialogs.
// The vanilla equivalent is #overlay — a shared div that activates with sheets.
export function Backdrop({ open, onClick, className }: BackdropProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClick}
      className={clsx(
        'absolute inset-0 bg-bg-scrim backdrop-blur-sm z-20',
        className,
      )}
    />
  );
}
