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
import {
  sendToPlugin,
  type SyncScope,
  type SyncTally,
  type ExistingCollection,
  type RenameData,
  type CollectionCheckResultMessage,
} from '../types/messages';
import { banner } from '../store/bannerStore';
import { toast } from '../store/toastStore';
import { SectionLabel, HelperText, StatValue, Mono, MicroText, CardTitle } from '../components/typography';

type RunPhase = 'config' | 'validation-warning' | 'loading' | 'success' | 'error';

const SCOPE_SEGMENTS = [
  { value: 'all', label: 'Everything' },
  { value: 'groups', label: 'Scale Only' },
  { value: 'roles', label: 'Roles Only' },
];

export function RunDialog() {
  const isOpen = useUiStore((s) => s.activeOverlay === 'run-dialog');
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const multiMode = useUiStore((s) => s.multiMode);
  const appState = useAppStore((s) => s.appState);
  const savedState = useAppStore((s) => s.savedState);
  const validate = useAppStore((s) => s.validate);

  const [phase, setPhase] = useState<RunPhase>('config');
  const [scope, setScope] = useState<SyncScope>('all');
  const [issues, setIssues] = useState<string[]>([]);
  const [tally, setTally] = useState<SyncTally | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [existingCollections, setExistingCollections] = useState<ExistingCollection[]>([]);
  const [renames, setRenames] = useState<RenameData | null>(null);

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

  const handleCollectionCheckResult = useCallback((msg: CollectionCheckResultMessage) => {
    setExistingCollections(msg.existing ?? []);
    setRenames(msg.renames ?? null);
  }, []);

  const handleFinish = useCallback((finishTally: SyncTally, errors: string[] | null) => {
    setTally(finishTally);
    setPhase('success');
    if (errors && errors.length > 0) {
      banner.show({
        id: 'run-errors',
        type: 'warning',
        title: 'Sync completed with errors',
        message: errors.join('\n'),
      });
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
            title="Publish to Figma"
            subtitle="Generate or update color variables in your Figma file."
            actions={<Button variant="ghost" size="sm" label="Cancel" onClick={handleCancel} />}
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
                <SectionLabel>Pending Renames</SectionLabel>
                <HelperText className="mb-2">
                  {renames!.summary.scaleCount > 0 &&
                    `${renames!.summary.scaleCount} scale variable${renames!.summary.scaleCount > 1 ? 's' : ''}`}
                  {renames!.summary.scaleCount > 0 && renames!.summary.tokenCount > 0 && ', '}
                  {renames!.summary.tokenCount > 0 &&
                    `${renames!.summary.tokenCount} token variable${renames!.summary.tokenCount > 1 ? 's' : ''}`}{' '}
                  will be renamed in-place.
                </HelperText>
                {renameChanges.slice(0, 5).map((change, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <MicroText className="capitalize">{change.type}:</MicroText>
                    <Mono>{change.from}</Mono>
                    <MicroText>→</MicroText>
                    <Mono className="text-accent">{change.to}</Mono>
                  </div>
                ))}
                {renameChanges.length > 5 && <MicroText className="mt-1">+{renameChanges.length - 5} more</MicroText>}
              </SettingsCard>
            )}

            {/* Existing collections summary */}
            {existingCollections.length > 0 && (
              <SettingsCard>
                <SectionLabel>Existing Collections</SectionLabel>
                {existingCollections.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0"
                  >
                    <CardTitle>{col.name}</CardTitle>
                    <Badge variant="muted" size="xs">
                      Update
                    </Badge>
                  </div>
                ))}
              </SettingsCard>
            )}

            {/* Free-plan multi-mode warning */}
            {!multiMode && appState.themes.length > 1 && (
              <div className="rounded-[8px] border border-warning/40 bg-warning-subtle px-3 py-2.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-warning">Only 1 theme will be applied</span>
                <span className="text-[11px] text-text-muted">
                  Your Figma plan supports only 1 mode per collection. Only <strong>{appState.themes[0]?.name}</strong>{' '}
                  will be written.
                  {appState.themes.slice(1).length > 0 && (
                    <>
                      {' '}
                      Skipped:{' '}
                      {appState.themes
                        .slice(1)
                        .map((t) => t.name)
                        .join(', ')}
                      .
                    </>
                  )}{' '}
                  Upgrade to a paid Figma plan to apply all themes.
                </span>
              </div>
            )}

            {/* resolveTokensDirectly in scale mode notice */}
            {appState.resolveTokensDirectly && appState.pluginMode === 'scale' && (
              <div className="rounded-[8px] border border-border-base bg-bg-input px-3 py-2.5 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-text-primary">
                  Scale collection will not be created
                </span>
                <span className="text-[11px] text-text-muted">
                  "Resolve Tokens Directly" is on — tokens store hex values directly instead of aliasing scale
                  variables. No scale collection will be written to Figma.
                </span>
              </div>
            )}

            {/* Config summary */}
            <SettingsCard>
              <SectionLabel>Summary</SectionLabel>
              <SmallRow label="Colors" control={<StatValue>{appState.colors.length}</StatValue>} />
              <SmallRow label="Roles" control={<StatValue>{appState.roles.length}</StatValue>} />
              <SmallRow label="Themes" control={<StatValue>{appState.themes.length}</StatValue>} />
              <SmallRow label="Variations" control={<StatValue>{(appState.variations ?? []).length}</StatValue>} />
              <SmallRow label="Mode" control={<StatValue className="capitalize">{appState.pluginMode}</StatValue>} />
            </SettingsCard>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-3 py-3 border-t border-border-base flex gap-2">
            <Button
              variant="secondary"
              size="xl"
              label="Preview in Canvas"
              onClick={() => toast.success('Command received — preview coming soon.')}
              className="flex-1"
            />
            <Button
              variant="primary"
              size="xl"
              label="Create / Update Variables"
              onClick={handleConfirmRun}
              className="flex-1"
            />
          </div>
        </>
      )}

      {/* Validation warning */}
      {phase === 'validation-warning' && (
        <ValidationWarningOverlay open issues={issues} onBack={() => setPhase('config')} onContinue={doRun} />
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
