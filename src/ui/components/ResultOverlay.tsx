import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';
import { Button } from './Button';
import { IconCheck, IconClose, IconAlertTriangle } from './icons';
import type { SyncTally } from '../types/messages';

// ── Loading overlay ──────────────────────────────────────────────────────────

interface LoadingOverlayProps {
  open: boolean;
  title?: string;
  subtitle?: string;
}

export function LoadingOverlay({
  open,
  title = 'Creating Variables…',
  subtitle = 'Generating color tokens and thematic variations in Figma.',
}: LoadingOverlayProps) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <Spinner size="lg" />
      <p className="text-xl font-bold text-text-primary">{title}</p>
      <p className="text-text-muted">{subtitle}</p>
    </div>
  );
}

// ── Success overlay ──────────────────────────────────────────────────────────

interface SuccessOverlayProps {
  open: boolean;
  tally?: SyncTally | null;
  onDismiss: () => void;
}

export function SuccessOverlay({ open, tally, onDismiss }: SuccessOverlayProps) {
  if (!open) return null;
  const rows: [string, number, string][] = tally ? [
    ['Created', tally.created, 'text-text-primary'],
    ['Updated', tally.updated, 'text-text-primary'],
    ...(tally.renamed > 0 ? [['Renamed', tally.renamed, 'text-accent'] as [string, number, string]] : []),
    ['Failed',  tally.failed,  'text-danger'],
  ] : [];

  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8 text-center flex-col gap-4">
        <div className="w-20 h-20 bg-success-subtle rounded-full flex items-center justify-center text-success">
          <IconCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text-primary">Success!</h2>
        {rows.length > 0 && (
          <div className="text-text-muted space-y-1">
            {rows.map(([label, count, cls]) => (
              <p key={label} className="text-sm">
                {label}: <span className={clsx('font-bold', cls)}>{count}</span>
              </p>
            ))}
          </div>
        )}
        <Button variant="primary" size="lg" label="Back to Editor" onClick={onDismiss} className="mt-4 px-6" />
      </div>
    </div>
  );
}

// ── Error overlay ────────────────────────────────────────────────────────────

interface ErrorOverlayProps {
  open: boolean;
  message?: string;
  onDismiss: () => void;
}

export function ErrorOverlay({ open, message, onDismiss }: ErrorOverlayProps) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <div className="w-20 h-20 bg-danger-subtle rounded-full flex items-center justify-center text-danger">
        <IconClose className="w-6 h-6" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary">Error</h2>
      {message && <p className="text-danger">{message}</p>}
      <Button variant="secondary" size="lg" label="Dismiss" onClick={onDismiss} className="mt-4 px-6" />
    </div>
  );
}

// ── Validation warning overlay ───────────────────────────────────────────────
// Shows a list of issues before running; lets user go back or continue anyway.

interface ValidationWarningOverlayProps {
  open: boolean;
  issues: string[];
  onBack: () => void;
  onContinue: () => void;
}

export function ValidationWarningOverlay({ open, issues, onBack, onContinue }: ValidationWarningOverlayProps) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 bg-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <div className="w-16 h-16 bg-warning-subtle rounded-full flex items-center justify-center text-warning">
        <IconAlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-text-primary">
        {issues.length} issue{issues.length !== 1 ? 's' : ''} found
      </h2>
      <p className="text-text-muted text-[12px] text-center">
        These may corrupt variables in Figma. Review before continuing.
      </p>
      <ul className="w-full text-left space-y-2 max-h-48 overflow-y-auto">
        {issues.map((msg, i) => (
          <li key={i} className="text-[12px] bg-warning-subtle border border-warning rounded-[6px] px-3 py-2 text-text-primary">
            {msg}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 w-full">
        <Button variant="secondary" size="xl" label="Go back"        onClick={onBack}     className="flex-1" />
        <Button variant="primary"   size="xl" label="Continue Anyway" onClick={onContinue} className="flex-1" />
      </div>
    </div>
  );
}

// ── Generic content overlay ──────────────────────────────────────────────────
// For quick-start, design-lab, theme-shop — centred content, accent z-layer.

interface CentredOverlayProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  zIndex?: number;
}

export function CentredOverlay({ open, children, className, zIndex = 80 }: CentredOverlayProps) {
  if (!open) return null;
  return (
    <div
      className={clsx('absolute inset-0 bg-bg-app flex flex-col items-center justify-center gap-6 p-8 text-center', className)}
      style={{ zIndex }}
    >
      {children}
    </div>
  );
}
