import { type ReactNode } from 'react';
import clsx from 'clsx';

// Uppercase section divider label — used in settings panels.
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('text-[11px] font-bold tracking-[0.6px] text-text-muted mb-2', className)}>
      {children}
    </p>
  );
}

// Muted caption / hint text.
export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('text-text-dim text-[11px] px-1 leading-snug', className)}>
      {children}
    </p>
  );
}

// Small uppercase tracking label — for card section dividers (slightly bolder variant).
export function FieldLabel({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx('text-text-muted text-[11px] font-bold tracking-[1.2px] px-1 mt-1 block', className)}
    >
      {children}
    </label>
  );
}

// Small helper / description / info text.
export function HelperText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx('text-[11px] text-text-muted leading-snug', className)}>
      {children}
    </p>
  );
}

