import { type ReactNode } from "react";
import clsx from "clsx";

interface TypoProps  { children: ReactNode; className?: string; }
interface LabelProps extends TypoProps { htmlFor?: string; }

// ── Headings ──────────────────────────────────────────────────────────────────

export function PageTitle({ children, className }: TypoProps) {
  return <h1 className={clsx("text-[20px] font-bold text-n-tx-primary leading-tight", className)}>{children}</h1>;
}

export function ModalTitle({ children, className }: TypoProps) {
  return <h2 className={clsx("text-[16px] font-bold text-n-tx-primary leading-snug", className)}>{children}</h2>;
}

export function SheetTitle({ children, className }: TypoProps) {
  return <h2 className={clsx("text-[15px] font-semibold text-n-tx-primary leading-snug", className)}>{children}</h2>;
}

export function CardTitle({ children, className }: TypoProps) {
  return <h3 className={clsx("text-[13px] font-semibold text-n-tx-primary leading-snug", className)}>{children}</h3>;
}

export function ItemTitle({ children, className }: TypoProps) {
  return <h4 className={clsx("text-[12px] font-semibold text-n-tx-primary leading-normal", className)}>{children}</h4>;
}

// ── Form & panel labels ───────────────────────────────────────────────────────

export function SectionLabel({ children, className }: TypoProps) {
  return <p className={clsx("text-[12px] text-n-tx-primary", className)}>{children}</p>;
}

export function FieldLabel({ children, htmlFor, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={clsx("text-[11px] font-bold tracking-[1.2px] uppercase text-n-tx-muted px-1 mt-1 block", className)}>
      {children}
    </label>
  );
}

export function ControlLabel({ children, htmlFor, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={clsx("text-[12px] font-medium text-n-tx-muted ml-0.5 block", className)}>
      {children}
    </label>
  );
}

// ── Body & descriptions ───────────────────────────────────────────────────────

export function BodyText({ children, className }: TypoProps) {
  return <p className={clsx("text-[13px] text-n-tx-muted leading-relaxed", className)}>{children}</p>;
}

export function DetailText({ children, className }: TypoProps) {
  return <p className={clsx("text-[12px] text-n-tx-muted leading-relaxed", className)}>{children}</p>;
}

export function Subtitle({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-n-tx-muted mt-0.5 leading-snug", className)}>{children}</p>;
}

// ── Captions & helpers ────────────────────────────────────────────────────────

export function HelperText({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-n-tx-muted leading-snug", className)}>{children}</p>;
}

export function LabelText({ children, className }: TypoProps) {
  return <p className={clsx("text-[13px] text-n-tx-primary leading-snug", className)}>{children}</p>;
}

export function Caption({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-n-tx-dim leading-snug", className)}>{children}</p>;
}

export function MicroText({ children, className }: TypoProps) {
  return <span className={clsx("text-[10px] text-n-tx-dim", className)}>{children}</span>;
}

// ── Inline value display ──────────────────────────────────────────────────────

export function StatValue({ children, className }: TypoProps) {
  return <span className={clsx("text-[12px] font-semibold text-n-tx-primary", className)}>{children}</span>;
}

export function Mono({ children, className }: TypoProps) {
  return <span className={clsx("font-mono text-[11px] text-n-tx-primary", className)}>{children}</span>;
}

export function MonoMuted({ children, className }: TypoProps) {
  return <span className={clsx("font-mono text-[10px] text-n-tx-muted", className)}>{children}</span>;
}
