import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'        // filled accent — main CTA
  | 'secondary'      // filled surface — default action
  | 'ghost'          // no border/bg, subtle text
  | 'outlined'       // transparent bg, visible border
  | 'dashed'         // dashed border, accent color
  | 'underlined'     // no box, just a text underline
  | 'danger'         // danger tint fill
  | 'danger-solid'   // solid red fill
  | 'danger-outlined'// transparent bg, red border
  | 'icon';          // square icon-only, no bg

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type ButtonRadius =
  | 'sharp'     // 0px
  | 'sm'        // 4–6px — matches size
  | 'md'        // default per size
  | 'lg'        // larger pill-ish
  | 'full';     // pill

// ── Size tokens ───────────────────────────────────────────────────────────────
// Each size: height + horizontal padding + font size. Radius applied separately.

const SIZE_H: Record<ButtonSize, string> = {
  xs:  'h-5      px-1.5   text-[10px] gap-1',
  sm:  'h-[26px] px-2     text-[11px] gap-1',
  md:  'h-[30px] px-2.5   text-[12px] gap-1.5',
  lg:  'h-[34px] px-3     text-[12px] gap-1.5',
  xl:  'h-[38px] px-3.5   text-[13px] gap-2',
  '2xl':'h-[44px] px-5    text-[14px] gap-2',
};

const SIZE_SQUARE: Record<ButtonSize, string> = {
  xs:  'size-5      shrink-0 text-[10px]',
  sm:  'size-[26px] shrink-0 text-[11px]',
  md:  'size-[30px] shrink-0 text-[12px]',
  lg:  'size-[34px] shrink-0 text-[12px]',
  xl:  'size-[38px] shrink-0 text-[13px]',
  '2xl':'size-[44px] shrink-0 text-[14px]',
};

// Default radius per size when radius prop is 'md' (default)
const RADIUS_DEFAULT: Record<ButtonSize, string> = {
  xs:  'rounded-[3px]',
  sm:  'rounded-[5px]',
  md:  'rounded-[6px]',
  lg:  'rounded-[7px]',
  xl:  'rounded-[8px]',
  '2xl':'rounded-[10px]',
};

const RADIUS_MAP: Partial<Record<ButtonRadius, string>> = {
  sharp: 'rounded-none',
  sm:    'rounded-[4px]',
  lg:    'rounded-[12px]',
  full:  'rounded-full',
  // 'md' is handled by RADIUS_DEFAULT per size
};

// ── Variant tokens ────────────────────────────────────────────────────────────
// NOTE: Tailwind's opacity modifier (bg-danger/10) does NOT work with CSS
// variables — Tailwind needs static hex to split into RGB channels. All tint
// backgrounds and focus rings use the dedicated *-subtle and *-glow tokens
// from the design system instead.

const VARIANT: Record<ButtonVariant, string> = {
  // Filled accent — primary CTA
  primary:
    'bg-accent border-accent text-text-on-accent ' +
    'hover:bg-accent-hover hover:border-accent-hover ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent-glow ' +
    'active:opacity-80',

  // Filled surface — default secondary action
  secondary:
    'bg-bg-input border-border-base text-text-primary ' +
    'hover:bg-bg-hover hover:border-border-strong ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-border-base ' +
    'active:opacity-80',

  // No box — quiet inline action
  ghost:
    'bg-transparent border-transparent text-text-muted ' +
    'hover:bg-bg-hover hover:text-text-primary ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-border-base ' +
    'active:opacity-70',

  // Transparent bg, visible border — alternative to secondary
  outlined:
    'bg-transparent border-border-base text-text-primary ' +
    'hover:bg-bg-hover hover:border-border-strong ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-border-base ' +
    'active:opacity-80',

  // Dashed border — "add" / create affordance
  dashed:
    'bg-transparent border-dashed border-accent text-accent ' +
    'hover:bg-accent-subtle ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-accent-glow ' +
    'active:opacity-70',

  // Text only — inline link-style action
  underlined:
    'bg-transparent border-transparent text-text-secondary underline underline-offset-2 decoration-border-base ' +
    'hover:text-accent hover:decoration-accent ' +
    'focus-visible:outline-none focus-visible:text-accent ' +
    'active:opacity-70',

  // Danger tint — soft destructive (delete in a list row)
  danger:
    'bg-danger-subtle border-danger-subtle text-danger ' +
    'hover:bg-danger-subtle hover:border-danger ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-danger ' +
    'active:opacity-80',

  // Solid red — hard destructive (confirm delete dialog)
  'danger-solid':
    'bg-danger border-danger text-text-on-accent ' +
    'hover:bg-danger-hover hover:border-danger-hover ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-danger ' +
    'active:opacity-80',

  // Outlined red — destructive but less alarming than solid
  'danger-outlined':
    'bg-transparent border-danger text-danger ' +
    'hover:bg-danger-subtle ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-danger ' +
    'active:opacity-80',

  // Square icon-only — toolbar / card controls
  icon:
    'bg-transparent border-transparent text-text-muted ' +
    'hover:bg-bg-hover hover:text-text-primary ' +
    'focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-border-base ' +
    'active:opacity-70',
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  square?: boolean;       // force equal width/height (icon button shape)
  label?: string;         // text label — can also use children
  leftIcon?: ReactNode;   // icon before label
  rightIcon?: ReactNode;  // icon after label
  icon?: ReactNode;       // shorthand: single icon, implies square when no label
  loading?: boolean;      // shows spinner, disables interaction
  fullWidth?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Button({
  variant = 'secondary',
  size = 'lg',
  radius = 'md',
  square,
  label,
  leftIcon,
  rightIcon,
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const hasLabel = !!(label || children);
  const isSquare = square || variant === 'icon' || (!hasLabel && !!icon);
  const sizeCls  = isSquare ? SIZE_SQUARE[size] : SIZE_H[size];
  const radCls   = RADIUS_MAP[radius] ?? RADIUS_DEFAULT[size];
  const isDisabled = disabled || loading;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium transition-all border select-none outline-none',
        sizeCls,
        radCls,
        VARIANT[variant],
        isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        fullWidth && 'w-full',
        className,
      )}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {(leftIcon || icon) && (
            <span className="inline-flex items-center justify-center shrink-0">
              {leftIcon ?? icon}
            </span>
          )}
          {label && <span>{label}</span>}
          {children}
          {rightIcon && (
            <span className="inline-flex items-center justify-center shrink-0">
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

const SPINNER_SIZE: Record<ButtonSize, number> = { xs: 10, sm: 12, md: 13, lg: 14, xl: 15, '2xl': 17 };

function Spinner({ size }: { size: ButtonSize }) {
  const s = SPINNER_SIZE[size];
  return (
    <svg
      width={s} height={s} viewBox="0 0 16 16" fill="none"
      className="animate-spin"
      style={{ animationDuration: '0.7s' }}
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ── ActionButton ──────────────────────────────────────────────────────────────
// Convenience: full-width dashed "add" call-to-action, unchanged API.

export function ActionButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant="dashed"
      size="xl"
      label={label}
      onClick={onClick}
      fullWidth
      className={className}
    />
  );
}
