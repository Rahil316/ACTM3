import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

// ── Size tokens ───────────────────────────────────────────────────────────────
// xs  20px — tiny in-card controls
// sm  28px — pill selectors, compact inline buttons
// md  32px — icon knob buttons (gear, trash in cards)
// lg  36px — labeled action buttons, tabs, Cancel/Done  (default)
// xl  40px — text inputs, header buttons, primary CTAs

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'dashed' | 'danger-solid';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE: Record<ButtonSize, string> = {
  xs: 'h-5      px-1     text-[10px] rounded-[4px]',
  sm: 'h-[28px] px-2     text-[11px] rounded-[6px]',
  md: 'h-[32px] px-2.5   text-[12px] rounded-[7px]',
  lg: 'h-[36px] px-3     text-[12px] rounded-[8px]',
  xl: 'h-[40px] px-4     text-[13px] rounded-[8px]',
};

const SIZE_SQUARE: Record<ButtonSize, string> = {
  xs: 'size-5      shrink-0 text-[10px] rounded-[4px]',
  sm: 'size-[28px] shrink-0 text-[11px] rounded-[6px]',
  md: 'size-[32px] shrink-0 text-[12px] rounded-[7px]',
  lg: 'size-[36px] shrink-0 text-[12px] rounded-[8px]',
  xl: 'size-[40px] shrink-0 text-[13px] rounded-[8px]',
};

const VARIANT: Record<ButtonVariant, string> = {
  primary:       'bg-accent border-accent text-white hover:opacity-90 cursor-pointer',
  secondary:     'bg-bg-input border-border-base text-text-primary hover:bg-bg-hover cursor-pointer',
  ghost:         'bg-transparent border-transparent text-text-muted hover:bg-bg-hover hover:text-text-primary cursor-pointer',
  danger:        'bg-danger/10 border-danger/20 text-danger hover:bg-danger/20 cursor-pointer',
  icon:          'bg-transparent border-transparent text-text-muted hover:bg-bg-hover hover:text-text-primary cursor-pointer',
  dashed:        'bg-transparent border-2 border-dashed border-accent text-accent hover:bg-accent/10 cursor-pointer',
  'danger-solid':'bg-red-500 border-red-500 text-white hover:opacity-90 cursor-pointer',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  square?: boolean;
  icon?: ReactNode;
  label?: string;
}

export function Button({
  variant = 'secondary',
  size = 'lg',
  square = false,
  icon,
  label,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isSquare = square || variant === 'icon';
  const sizeCls = (isSquare ? SIZE_SQUARE : SIZE)[size];

  return (
    <button
      {...rest}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-all border select-none',
        sizeCls,
        VARIANT[variant],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
      {label && <span>{label}</span>}
      {children}
    </button>
  );
}

// Convenience: dashed full-width "add" call-to-action
export function ActionButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <Button variant="dashed" size="xl" label={label} onClick={onClick} className={clsx('w-full', className)} />
  );
}
