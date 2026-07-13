import { type InputHTMLAttributes } from "react";
import clsx from "clsx";

// ── Size tokens ───────────────────────────────────────────────────────────────

export type NumberStepperSize = "table" | "sm" | "md";

const SIZE: Record<NumberStepperSize, { h: string; text: string; btnW: string; r: string }> = {
  table: { h: "h-[26px]", text: "text-[11px]", btnW: "w-5", r: "rounded-[4px]" },
  sm:    { h: "h-[28px]", text: "text-[11px]", btnW: "w-6", r: "rounded-[5px]" },
  md:    { h: "h-[32px]", text: "text-[12px]", btnW: "w-7", r: "rounded-[6px]" },
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NumberStepperProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "onChange" | "value"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Called when a +/- button is clicked, with the resolved next numeric value. */
  onNudge: (next: number) => void;
  size?: NumberStepperSize;
  /** Step applied on a plain click. Default 0.1. */
  step?: number;
  /** Step applied when the modifier key (Shift) is held. Default 1. */
  bigStep?: number;
  min?: number;
  max?: number;
  /** Decimal places to round the nudged result to. Default 1 (matches step=0.1). */
  precision?: number;
}

/**
 * Numeric input flanked by −/+ buttons, replacing the browser's native
 * spinner arrows. Plain click nudges by `step` (default 0.1); holding Shift
 * nudges by `bigStep` (default 1) — matches this app's own number-input
 * convention (fine adjustment by default, Shift for coarse jumps).
 *
 * Typing is unaffected — `value`/`onChange`/`onBlur` behave like a normal
 * controlled text input (pair with `useLocalField` for commit-on-blur).
 */
export function NumberStepper({
  value,
  onChange,
  onNudge,
  size = "table",
  step = 0.1,
  bigStep = 1,
  min,
  max,
  precision = 1,
  className,
  ...rest
}: NumberStepperProps) {
  const s = SIZE[size];

  function nudge(e: React.MouseEvent, dir: 1 | -1) {
    const delta = e.shiftKey ? bigStep : step;
    const current = parseFloat(value);
    const base = isNaN(current) ? 0 : current;
    const factor = 10 ** precision;
    let next = Math.round((base + dir * delta) * factor) / factor;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onNudge(next);
  }

  return (
    <div className={clsx("flex items-center w-full border border-n-br-default bg-n-sf-input overflow-hidden", s.h, s.r, className)}>
      <button
        type="button"
        tabIndex={-1}
        title={`−${step} (Shift: −${bigStep})`}
        onClick={(e) => nudge(e, -1)}
        className={clsx("flex items-center justify-center h-full shrink-0 text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary active:opacity-70 select-none", s.btnW)}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        className={clsx("flex-1 min-w-0 h-full text-center bg-transparent text-n-tx-primary outline-none", "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", s.text)}
        {...rest}
      />
      <button
        type="button"
        tabIndex={-1}
        title={`+${step} (Shift: +${bigStep})`}
        onClick={(e) => nudge(e, 1)}
        className={clsx("flex items-center justify-center h-full shrink-0 text-n-tx-muted hover:bg-n-sf-hover hover:text-n-tx-primary active:opacity-70 select-none", s.btnW)}
      >
        +
      </button>
    </div>
  );
}
