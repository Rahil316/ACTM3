import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { useUiStore } from '../store/uiStore';
import { useFigmaBridge, type BridgeCallbacks } from '../hooks/useFigmaBridge';
import { Modal, ModalHeader } from '../components/Modal';
import { SettingsCard, SmallRow } from '../components/SettingsCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { LoadingOverlay, SuccessOverlay, ErrorOverlay, ValidationWarningOverlay } from '../components/ResultOverlay';
import { sendToPlugin, type SyncScope, type SyncTally, type ExistingCollection, type RenameData, type CollectionCheckResultMessage } from '../types/messages';
import { banner } from '../store/bannerStore';

type RunPhase = 'config' | 'validation-warning' | 'loading' | 'success' | 'error';

const SCOPE_SEGMENTS = [
  { value: 'all',    label: 'Everything' },
  { value: 'groups', label: 'Scale Only' },
  { value: 'roles',  label: 'Roles Only' },
];

export function RunDialog() {
  const isOpen       = useUiStore((s) => s.activeOverlay === 'run-dialog');
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const appState     = useAppStore((s) => s.appState);
  const savedState   = useAppStore((s) => s.savedState);
  const validate     = useAppStore((s) => s.validate);

  const [phase, setPhase]         = useState<RunPhase>('config');
  const [scope, setScope]         = useState<SyncScope>('all');
  const [issues, setIssues]       = useState<string[]>([]);
  const [tally, setTally]         = useState<SyncTally | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string>('');
  const [existingCollections, setExistingCollections] = useState<ExistingCollection[]>([]);
  const [renames, setRenames]     = useState<RenameData | null>(null);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setPhase('config');
      setTally(null);
      setErrorMsg('');
      setIssues([]);
      setRenames(null);
      sendToPlugin({ type: 'check-collections', state: appState, savedState: savedState ?? null });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleCollectionCheckResult = useCallback(
    (msg: CollectionCheckResultMessage) => {
      setExistingCollections(msg.existing ?? []);
      setRenames(msg.renames ?? null);
    },
    [],
  );

  const handleFinish = useCallback((finishTally: SyncTally, errors: string[] | null) => {
    setTally(finishTally);
    setPhase('success');
    if (errors && errors.length > 0) {
      banner.show({ id: 'run-errors', type: 'warning', title: 'Sync completed with errors', message: errors.join('\n') });
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMsg(message);
    setPhase('error');
  }, []);

  const callbacks: BridgeCallbacks = {
    onCollectionCheckResult: handleCollectionCheckResult,
    onFinish: handleFinish,
    onError: handleError,
  };
  useFigmaBridge(callbacks);

  function handleConfirmRun() {
    const validationIssues = validate();
    if (validationIssues && validationIssues.length > 0) {
      setIssues(validationIssues);
      setPhase('validation-warning');
      return;
    }
    doRun();
  }

  function doRun() {
    setPhase('loading');
    sendToPlugin({ type: 'run-creator', state: appState, scope, savedState: savedState ?? null });
  }

  function handleCancel() {
    closeOverlay();
  }

  function handleDismissResult() {
    closeOverlay();
  }

  if (!isOpen) return null;

  const renameChanges = renames?.summary?.changes ?? [];
  const hasRenames = renameChanges.length > 0;

  return (
    <Modal open layer="dialog">
      {/* Config phase */}
      {phase === 'config' && (
        <>
          <ModalHeader
            title="Apply to Figma"
            subtitle="Generate or update color variables in your Figma file."
            actions={
              <>
                <Button variant="secondary" size="md" label="Cancel" onClick={handleCancel} />
                <Button variant="primary"   size="md" label="Run" onClick={handleConfirmRun} />
              </>
            }
          />
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">

            {/* Scope selector */}
            <SettingsCard>
              <SmallRow
                label="Scope"
                control={
                  <SegmentedControl
                    segments={SCOPE_SEGMENTS}
                    value={scope}
                    onChange={(v) => setScope(v as SyncScope)}
                  />
                }
              />
            </SettingsCard>

            {/* Pending renames summary */}
            {hasRenames && (
              <SettingsCard>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Pending Renames</p>
                <p className="text-[11px] text-text-muted mb-2">
                  {renames!.summary.scaleCount > 0 && `${renames!.summary.scaleCount} scale variable${renames!.summary.scaleCount > 1 ? 's' : ''}`}
                  {renames!.summary.scaleCount > 0 && renames!.summary.tokenCount > 0 && ', '}
                  {renames!.summary.tokenCount > 0 && `${renames!.summary.tokenCount} token variable${renames!.summary.tokenCount > 1 ? 's' : ''}`}
                  {' '}will be renamed in-place.
                </p>
                {renameChanges.slice(0, 5).map((change, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <span className="text-[11px] text-text-muted capitalize">{change.type}:</span>
                    <span className="text-[11px] font-mono text-text-primary">{change.from}</span>
                    <span className="text-[10px] text-text-muted">→</span>
                    <span className="text-[11px] font-mono text-accent">{change.to}</span>
                  </div>
                ))}
                {renameChanges.length > 5 && (
                  <p className="text-[10px] text-text-muted mt-1">
                    +{renameChanges.length - 5} more
                  </p>
                )}
              </SettingsCard>
            )}

            {/* Existing collections summary */}
            {existingCollections.length > 0 && (
              <SettingsCard>
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Existing Collections</p>
                {existingCollections.map((col) => (
                  <div key={col.id} className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
                    <span className="text-[12px] text-text-primary">{col.name}</span>
                    <Badge variant="muted" size="xs">Update</Badge>
                  </div>
                ))}
              </SettingsCard>
            )}

            {/* Config summary */}
            <SettingsCard>
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">Summary</p>
              <SmallRow
                label="Colors"
                control={<span className="text-[12px] text-text-primary font-semibold">{appState.colors.length}</span>}
              />
              <SmallRow
                label="Roles"
                control={<span className="text-[12px] text-text-primary font-semibold">{appState.roles.length}</span>}
              />
              <SmallRow
                label="Themes"
                control={<span className="text-[12px] text-text-primary font-semibold">{appState.themes.length}</span>}
              />
              <SmallRow
                label="Variations"
                control={<span className="text-[12px] text-text-primary font-semibold">{(appState.variations ?? []).length}</span>}
              />
              <SmallRow
                label="Mode"
                control={
                  <span className="text-[12px] text-text-primary font-semibold capitalize">{appState.pluginMode}</span>
                }
              />
            </SettingsCard>
          </div>
        </>
      )}

      {/* Validation warning */}
      {phase === 'validation-warning' && (
        <ValidationWarningOverlay
          open
          issues={issues}
          onBack={() => setPhase('config')}
          onContinue={doRun}
        />
      )}

      {/* Loading */}
      <LoadingOverlay open={phase === 'loading'} />

      {/* Success */}
      <SuccessOverlay open={phase === 'success'} tally={tally} onDismiss={handleDismissResult} />

      {/* Error */}
      <ErrorOverlay open={phase === 'error'} message={errorMsg} onDismiss={handleDismissResult} />
    </Modal>
  );
}
