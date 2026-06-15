import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';
import { Button } from './Button';
import { IconCheck, IconClose, IconAlertTriangle } from './icons';
import { ModalTitle, SheetTitle, HelperText, StatValue } from './typography';
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
    <div className="absolute inset-0 bg-n-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <Spinner size="lg" />
      <SheetTitle>{title}</SheetTitle>
      <HelperText>{subtitle}</HelperText>
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
  type TallyRow = [string, number, string];
  const rows: TallyRow[] = tally ? [
    ['Created', tally.created, ''],
    ['Updated', tally.updated, ''],
    ...(tally.renamed > 0 ? [['Renamed', tally.renamed, 'text-b-tx-muted'] as TallyRow] : []),
    ...(tally.removed > 0 ? [['Removed', tally.removed, 'text-n-tx-muted'] as TallyRow] : []),
    ...(tally.failed  > 0 ? [['Failed',  tally.failed,  'text-d-tx-muted'] as TallyRow] : []),
  ] : [];

  return (
    <div className="absolute inset-0 bg-n-bg-app z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-8 text-center flex-col gap-4">
        <div className="w-20 h-20 bg-s-fi-subtle rounded-full flex items-center justify-center text-s-tx-muted">
          <IconCheck className="w-8 h-8" />
        </div>
        <ModalTitle>Success!</ModalTitle>
        {rows.length > 0 && (
          <div className="space-y-1">
            {rows.map(([label, count, cls]) => (
              <p key={label} className="text-[12px] text-n-tx-muted">
                {label}: <StatValue className={clsx(cls)}>{count}</StatValue>
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
    <div className="absolute inset-0 bg-n-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <div className="w-20 h-20 bg-d-fi-subtle rounded-full flex items-center justify-center text-d-tx-muted">
        <IconClose className="w-6 h-6" />
      </div>
      <ModalTitle>Error</ModalTitle>
      {message && <HelperText className="text-d-tx-muted">{message}</HelperText>}
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
    <div className="absolute inset-0 bg-n-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <div className="w-16 h-16 bg-w-fi-subtle rounded-full flex items-center justify-center text-w-tx-muted">
        <IconAlertTriangle className="w-8 h-8" />
      </div>
      <SheetTitle>
        {issues.length} issue{issues.length !== 1 ? 's' : ''} found
      </SheetTitle>
      <HelperText className="text-center">
        These may corrupt variables in Figma. Review before continuing.
      </HelperText>
      <ul className="w-full text-left space-y-2 max-h-48 overflow-y-auto">
        {issues.map((msg, i) => (
          <li key={i} className="text-[12px] bg-w-fi-subtle border border-w-br-default rounded-[6px] px-3 py-2 text-n-tx-primary">
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
      className={clsx('absolute inset-0 bg-n-bg-app flex flex-col items-center justify-center gap-6 p-8 text-center', className)}
      style={{ zIndex }}
    >
      {children}
    </div>
  );
}
