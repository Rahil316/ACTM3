import { type ReactNode } from "react";
import clsx from "clsx";

// Shared prop shapes
interface TypoProps {
  children: ReactNode;
  className?: string;
}
interface LabelProps extends TypoProps {
  htmlFor?: string;
}

// ============================================================================
// 1. HEADINGS
// ============================================================================

/** App bar / welcome screen top-level title (20px bold) */
export function PageTitle({ children, className }: TypoProps) {
  return <h1 className={clsx("text-[20px] font-bold text-text-primary leading-tight", className)}>{children}</h1>;
}

/** Modal, sheet and confirm dialog titles (16px bold) */
export function ModalTitle({ children, className }: TypoProps) {
  return <h2 className={clsx("text-[16px] font-bold text-text-primary leading-snug", className)}>{children}</h2>;
}

/** Dialogue/sheet layout title — slightly smaller modal variant (15px semibold) */
export function SheetTitle({ children, className }: TypoProps) {
  return <h2 className={clsx("text-[15px] font-semibold text-text-primary leading-snug", className)}>{children}</h2>;
}

/** Card, collapsible panel and list section headings (13px semibold) */
export function CardTitle({ children, className }: TypoProps) {
  return <h3 className={clsx("text-[13px] font-semibold text-text-primary leading-snug", className)}>{children}</h3>;
}

/** Small headings for list rows, preset names, item titles (12px semibold) */
export function ItemTitle({ children, className }: TypoProps) {
  return <h4 className={clsx("text-[12px] font-semibold text-text-primary leading-normal", className)}>{children}</h4>;
}

// ============================================================================
// 2. FORM & PANEL LABELS
// ============================================================================

/** Uppercase section divider in sidebars and settings panels (11px bold) */
export function SectionLabel({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] font-bold tracking-[0.6px] text-white", className)}>{children}</p>;
}

/** Form group header or input group label — renders a <label> (11px bold uppercase) */
export function FieldLabel({ children, htmlFor, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={clsx("text-[11px] font-bold tracking-[1.2px] uppercase text-text-muted px-1 mt-1 block", className)}>
      {children}
    </label>
  );
}

/** Inline input/select label rendered above a control (12px medium muted) */
export function ControlLabel({ children, htmlFor, className }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={clsx("text-[12px] font-medium text-text-muted ml-0.5 block", className)}>
      {children}
    </label>
  );
}

// ============================================================================
// 3. BODY & DESCRIPTIONS
// ============================================================================

/** Standard body copy for descriptions, empty states, settings rows (13px muted relaxed) */
export function BodyText({ children, className }: TypoProps) {
  return <p className={clsx("text-[13px] text-text-muted leading-relaxed", className)}>{children}</p>;
}

/** Compact description — dialog body, panel descriptions, subtitle copy (12px muted relaxed) */
export function DetailText({ children, className }: TypoProps) {
  return <p className={clsx("text-[12px] text-text-muted leading-relaxed", className)}>{children}</p>;
}

/** Secondary line beneath a title — modal subtitle, card subtitle (11px muted) */
export function Subtitle({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-text-muted mt-0.5 leading-snug", className)}>{children}</p>;
}

// ============================================================================
// 4. CAPTIONS & HELPERS
// ============================================================================

/** Small helper, validation or status text (11px muted snug) */
export function HelperText({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-text-muted leading-snug", className)}>{children}</p>;
}

/** Small helper, validation or status text (11px muted snug) */
export function LabelText({ children, className }: TypoProps) {
  return <p className={clsx("text-[13px] text-white leading-snug", className)}>{children}</p>;
}

/** Dim hint text beneath inputs or inside tooltips (11px dim snug) */
export function Caption({ children, className }: TypoProps) {
  return <p className={clsx("text-[11px] text-text-dim leading-snug", className)}>{children}</p>;
}

/** Micro metadata — timestamps, counts, secondary identifiers (10px dim) */
export function MicroText({ children, className }: TypoProps) {
  return <span className={clsx("text-[10px] text-text-dim", className)}>{children}</span>;
}

// ============================================================================
// 5. INLINE VALUE DISPLAY
// ============================================================================

/** Bold numeric or string value in summary/stat rows — inline (12px semibold primary) */
export function StatValue({ children, className }: TypoProps) {
  return <span className={clsx("text-[12px] font-semibold text-text-primary", className)}>{children}</span>;
}

/** Monospace token name, hex value or CSS variable — inline (11px mono primary) */
export function Mono({ children, className }: TypoProps) {
  return <span className={clsx("font-mono text-[11px] text-text-primary", className)}>{children}</span>;
}

/** Monospace hex or numeric value in muted context — inline (10px mono muted) */
export function MonoMuted({ children, className }: TypoProps) {
  return <span className={clsx("font-mono text-[10px] text-text-muted", className)}>{children}</span>;
}
