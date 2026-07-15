import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';
import { Button } from './Button';
import { IconCheck, IconClose, IconAlertTriangle } from './icons';
import { ModalTitle, SheetTitle, HelperText, StatValue, LabelText, Caption } from './typography';
import { SettingsCard, SmallRow } from './SettingsCard';
import { ResizeHandle } from './Modal';
import type { SyncTally, PerCollectionTally, SyncCollectionKind } from '../types/messages';

// ── Operation overlay ────────────────────────────────────────────────────────
// Full-screen overlay for async operations: sync and canvas preview.

type OperationKind = "sync" | "preview";

interface OperationOverlayProps {
  open: boolean;
  kind: OperationKind;
}

const OPERATION_CONTENT: Record<OperationKind, { title: string; subtitle: string }> = {
  sync: {
    title: "Publishing to Figma…",
    subtitle: "Creating and updating color variables.",
  },
  preview: {
    title: "Generating Canvas Preview…",
    subtitle: "Rendering token swatches — do not close the plugin.",
  },
};

export function OperationOverlay({ open, kind }: OperationOverlayProps) {
  if (!open) return null;
  const { title, subtitle } = OPERATION_CONTENT[kind];
  return (
    <div className="absolute inset-0 bg-n-bg-app z-50 flex items-center justify-center p-8 text-center flex-col gap-4">
      <Spinner size="lg" />
      <SheetTitle>{title}</SheetTitle>
      <HelperText>{subtitle}</HelperText>
    </div>
  );
}

// ── Success overlay ──────────────────────────────────────────────────────────

const COLLECTION_LABEL: Record<SyncCollectionKind, string> = {
  scale: 'Scale',
  token: 'Tokens',
  source: 'Source Colors',
};
const COLLECTION_ORDER: SyncCollectionKind[] = ['scale', 'token', 'source'];

interface SuccessOverlayProps {
  open: boolean;
  tally?: SyncTally | null;
  perCollection?: PerCollectionTally;
  durationMs?: number;
  collectionNames?: Partial<Record<SyncCollectionKind, string>>;
  onDismiss: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SuccessOverlay({ open, tally, perCollection, durationMs, collectionNames, onDismiss }: SuccessOverlayProps) {
  if (!open) return null;

  const collectionRows = COLLECTION_ORDER
    .map((kind) => ({ kind, entry: perCollection?.[kind] }))
    .filter((r): r is { kind: SyncCollectionKind; entry: NonNullable<PerCollectionTally[SyncCollectionKind]> } => !!r.entry && (r.entry.created + r.entry.updated + r.entry.renamed) > 0);

  type TallyRow = [string, number, string];
  const crossCuttingRows: TallyRow[] = tally ? [
    ...(tally.renamed > 0 && collectionRows.length === 0 ? [['Renamed', tally.renamed, 'text-b-tx-muted'] as TallyRow] : []),
    ...(tally.removed > 0 ? [['Removed', tally.removed, 'text-n-tx-muted'] as TallyRow] : []),
    ...(tally.failed  > 0 ? [['Failed',  tally.failed,  'text-d-tx-muted'] as TallyRow] : []),
  ] : [];

  // Fallback flat view — used when the sandbox hasn't sent a per-collection
  // breakdown (older cached state, or a caller that only has the flat tally).
  const flatRows: TallyRow[] = !perCollection && tally ? [
    ['Created', tally.created, ''],
    ['Updated', tally.updated, ''],
    ...(tally.renamed > 0 ? [['Renamed', tally.renamed, 'text-b-tx-muted'] as TallyRow] : []),
    ...(tally.removed > 0 ? [['Removed', tally.removed, 'text-n-tx-muted'] as TallyRow] : []),
    ...(tally.failed  > 0 ? [['Failed',  tally.failed,  'text-d-tx-muted'] as TallyRow] : []),
  ] : [];

  const total = tally ? tally.created + tally.updated + tally.renamed : 0;

  return (
    <div className="absolute inset-0 bg-n-bg-app z-50 flex flex-col overflow-y-auto">
      <div className="flex-1 flex items-center justify-center p-8 text-center flex-col gap-4">
        <div className="w-20 h-20 bg-s-fi-subtle rounded-full flex items-center justify-center text-s-tx-muted">
          <IconCheck className="w-8 h-8" />
        </div>
        <ModalTitle>Success!</ModalTitle>
        <HelperText className="text-n-tx-dim -mt-2">
          {total} variable{total !== 1 ? 's' : ''} synced
          {durationMs != null && ` in ${formatDuration(durationMs)}`}
        </HelperText>

        {collectionRows.length > 0 && (
          <SettingsCard className="!space-y-0 divide-y divide-n-br-hairline w-full max-w-xs text-left">
            {collectionRows.map(({ kind, entry }) => {
              const name = collectionNames?.[kind];
              const parts = [
                entry.created > 0 && `${entry.created} created`,
                entry.updated > 0 && `${entry.updated} updated`,
                entry.renamed > 0 && `${entry.renamed} renamed`,
              ].filter(Boolean);
              return (
                <SmallRow
                  key={kind}
                  label={COLLECTION_LABEL[kind]}
                  control={
                    <div className="text-right">
                      <StatValue className="text-[12px]">{parts.join(' · ')}</StatValue>
                      {name && <Caption className="block text-n-tx-dim truncate">{name}</Caption>}
                    </div>
                  }
                />
              );
            })}
          </SettingsCard>
        )}

        {(collectionRows.length > 0 ? crossCuttingRows : flatRows).length > 0 && (
          <div className="space-y-1">
            {(collectionRows.length > 0 ? crossCuttingRows : flatRows).map(([label, count, cls]) => (
              <p key={label} className="text-[12px] text-n-tx-muted">
                {label}: <StatValue className={clsx(cls)}>{count}</StatValue>
              </p>
            ))}
          </div>
        )}

        {total === 0 && crossCuttingRows.length === 0 && flatRows.length === 0 && (
          <LabelText className="text-n-tx-dim">No variable changes</LabelText>
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
      <ResizeHandle zIndex={zIndex + 10} />
    </div>
  );
}
