import { type ReactNode } from "react";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BadgeVariant =
  | "default"  // neutral surface — counts, labels
  | "accent"   // brand blue — active state, feature flags
  | "success"  // green — done, valid, passing
  | "warning"  // amber — caution, in-progress
  | "danger"   // red — errors, failing
  | "muted"    // very quiet — metadata, secondary info
  | "outline"; // transparent bg, border only — low-emphasis labels

export type BadgeSize = "xs" | "sm" | "md";

// ── Variant styles ────────────────────────────────────────────────────────────

const VARIANT: Record<BadgeVariant, string> = {
  default: "bg-n-sf-active  text-n-tx-secondary  border-transparent",
  accent:  "bg-b-fi-subtle  text-b-tx-muted       border-transparent",
  success: "bg-s-fi-subtle  text-s-tx-muted       border-transparent",
  warning: "bg-w-fi-subtle  text-w-tx-muted       border-transparent",
  danger:  "bg-d-fi-subtle  text-d-tx-muted       border-transparent",
  muted:   "bg-n-sf-input   text-n-tx-dim         border-transparent",
  outline: "bg-transparent  text-n-tx-muted       border-n-br-subtle",
};

// ── Size styles ───────────────────────────────────────────────────────────────

const SIZE: Record<BadgeSize, string> = {
  xs: "text-[9px]  px-1    py-px   gap-0.5 rounded-[3px]",
  sm: "text-[10px] px-1.5  py-0.5  gap-1   rounded-[4px]",
  md: "text-[11px] px-2    py-0.5  gap-1   rounded-[5px]",
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  pill?: boolean;
  dot?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Badge({ children, variant = "default", size = "sm", leftIcon, rightIcon, pill = false, dot = false, onRemove, onClick, disabled = false, title, className }: BadgeProps) {
  const isInteractive = onClick && !disabled;

  return (
    <span
      title={title}
      onClick={isInteractive ? onClick : undefined}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      className={clsx(
        "inline-flex items-center border font-medium select-none whitespace-nowrap",
        SIZE[size],
        VARIANT[variant],
        pill ? "rounded-full" : "",
        isInteractive && "cursor-pointer hover:brightness-110 transition-all",
        disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        className,
      )}
    >
      {dot && (
        <span className={clsx("rounded-full shrink-0 bg-current opacity-80", size === "xs" ? "size-[5px]" : "size-[6px]")} />
      )}

      {leftIcon && <span className="inline-flex items-center shrink-0">{leftIcon}</span>}

      {children}

      {rightIcon && !onRemove && <span className="inline-flex items-center shrink-0">{rightIcon}</span>}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          disabled={disabled}
          aria-label="Remove"
          className={clsx(
            "inline-flex items-center justify-center shrink-0 ml-0.5 -mr-0.5",
            "rounded-sm opacity-60 hover:opacity-100 transition-opacity",
            "bg-transparent border-none cursor-pointer p-0 leading-none",
            size === "xs" ? "text-[8px]" : "text-[9px]",
          )}
        >
          ✕
        </button>
      )}
    </span>
  );
}
