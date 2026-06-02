import { type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useId } from "react";
import clsx from "clsx";

// ── Types ─────────────────────────────────────────────────────────────────────

export type InputSize = "table" | "sm" | "md" | "lg" | "xl";
export type InputState = "default" | "error" | "warning" | "success";

// ── Size tokens ───────────────────────────────────────────────────────────────

const SIZE: Record<InputSize, { h: string; text: string; px: string; r: string }> = {
  table: { h: "h-[26px]", text: "text-[11px]", px: "px-1.5", r: "rounded-[4px]" },
  sm: { h: "h-[28px]", text: "text-[11px]", px: "px-2", r: "rounded-[5px]" },
  md: { h: "h-[32px]", text: "text-[12px]", px: "px-2.5", r: "rounded-[6px]" },
  lg: { h: "h-[36px]", text: "text-[13px]", px: "px-3", r: "rounded-[7px]" },
  xl: { h: "h-[40px]", text: "text-[13px]", px: "px-3", r: "rounded-[8px]" },
};

// ── State — border + focus ring colour ───────────────────────────────────────

const STATE_BORDER: Record<InputState, string> = {
  default: "border-border-input   focus:border-border-focus",
  error: "border-danger         focus:border-danger",
  warning: "border-warning        focus:border-warning",
  success: "border-success        focus:border-success",
};

const STATE_HINT: Record<InputState, string> = {
  default: "text-text-muted",
  error: "text-danger",
  warning: "text-warning",
  success: "text-success",
};

// ── Shared classes ────────────────────────────────────────────────────────────

const BASE_INPUT = "w-full bg-bg-input text-text-primary border outline-none transition-colors " + "placeholder:text-text-dim " + "disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none";

// ── Shared label / hint wrapper ───────────────────────────────────────────────

function InputWrapper({ id, label, hint, state, infoIcon, children, width }: { id: string; label?: string; hint?: string; state: InputState; infoIcon?: ReactNode; children: ReactNode; width: string }) {
  const hasOuter = label || hint;
  if (!hasOuter) return <>{children}</>;
  return (
    <div className={clsx("flex flex-col gap-1", width)}>
      {label && (
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-[12px] font-medium text-text-muted ml-0.5">
            {label}
          </label>
          {infoIcon}
        </div>
      )}
      {children}
      {hint && <p className={clsx("text-[11px] ml-0.5", STATE_HINT[state])}>{hint}</p>}
    </div>
  );
}

// ── Icon wrapper ──────────────────────────────────────────────────────────────

function WithIcons({ children, leading, trailing, size }: { children: ReactNode; leading?: ReactNode; trailing?: ReactNode; size: InputSize }) {
  if (!leading && !trailing) return <>{children}</>;
  const iconSize = size === "table" || size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  return (
    <div className="relative flex items-center">
      {leading && <span className={clsx("absolute left-2.5 flex items-center justify-center text-text-muted pointer-events-none shrink-0", iconSize)}>{leading}</span>}
      {children}
      {trailing && <span className={clsx("absolute right-2.5 flex items-center justify-center text-text-muted pointer-events-none shrink-0", iconSize)}>{trailing}</span>}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "width"> {
  size?: InputSize;
  inputState?: InputState; // renamed from 'state' to avoid clash with HTML attr
  width?: "full" | "flex" | "auto";
  label?: string;
  hint?: string; // shown below; colour follows inputState
  mono?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  infoIcon?: ReactNode;
}

export function Input({ size = "lg", inputState = "default", width = "full", label, hint, mono = false, leadingIcon, trailingIcon, infoIcon, disabled, className, id: idProp, ...rest }: InputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const s = SIZE[size];

  const widthCls = width === "full" ? "w-full" : width === "flex" ? "flex-1 min-w-0" : "";

  const inputEl = (
    <input
      id={id}
      disabled={disabled}
      className={clsx(
        BASE_INPUT,
        s.h,
        s.text,
        s.px,
        s.r,
        leadingIcon && (size === "table" || size === "sm" ? "pl-6" : "pl-8"),
        trailingIcon && (size === "table" || size === "sm" ? "pr-6" : "pr-8"),
        STATE_BORDER[inputState],
        mono && "font-mono tracking-wider uppercase",
        !label && !hint ? widthCls : "",
        className,
      )}
      {...rest}
    />
  );

  return (
    <InputWrapper id={id} label={label} hint={hint} state={inputState} infoIcon={infoIcon} width={widthCls}>
      <WithIcons leading={leadingIcon} trailing={trailingIcon} size={size}>
        {inputEl}
      </WithIcons>
    </InputWrapper>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "width"> {
  size?: InputSize;
  inputState?: InputState;
  width?: "full" | "flex" | "auto";
  label?: string;
  hint?: string;
  mono?: boolean;
  infoIcon?: ReactNode;
  minRows?: number;
}

export function Textarea({ size = "md", inputState = "default", width = "full", label, hint, mono = false, infoIcon, minRows = 3, disabled, className, id: idProp, style, ...rest }: TextareaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const s = SIZE[size];

  const widthCls = width === "full" ? "w-full" : width === "flex" ? "flex-1 min-w-0" : "";

  const el = (
    <textarea
      id={id}
      disabled={disabled}
      style={{ minHeight: `calc(${minRows} * 1.5em + 1rem)`, resize: "vertical", ...style }}
      className={clsx(BASE_INPUT, s.text, s.px, s.r, "py-2", STATE_BORDER[inputState], mono && "font-mono", !label && !hint ? widthCls : "", className)}
      {...rest}
    />
  );

  return (
    <InputWrapper id={id} label={label} hint={hint} state={inputState} infoIcon={infoIcon} width={widthCls}>
      {el}
    </InputWrapper>
  );
}
