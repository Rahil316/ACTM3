import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "../store/projectStore";
import { useUiStore } from "../store/uiStore";
import { useFigmaBridge, type BridgeCallbacks } from "../hooks/useFigmaBridge";
import { Modal, ModalHeader } from "../components/Modal";
import { SettingsCard, SmallRow } from "../components/SettingsCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { LoadingOverlay, SuccessOverlay, ErrorOverlay, ValidationWarningOverlay } from "../components/ResultOverlay";
import { sendToPlugin, type SyncScope, type SyncTally, type SyncPreview, type StructuralChange, type ExistingCollection, type RenameData, type CollectionCheckResultMessage } from "../types/messages";
import { banner } from "../store/bannerStore";
import { SectionLabel, HelperText, StatValue, Mono, MicroText, CardTitle } from "../components/typography";
import { Callout } from "../components/Callout";
import { useSyncSession } from "../hooks/useSyncSession";
import { ConflictList } from "../components/ConflictList";

type RunPhase = "config" | "validation-warning" | "loading" | "success" | "error";

const SCOPE_SEGMENTS = [
  { value: "all", label: "Everything" },
  { value: "groups", label: "Scale Only" },
  { value: "roles", label: "Roles Only" },
];

export function RunDialog() {
  const isOpen = useUiStore((s) => s.activeOverlay === "run-dialog");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const multiMode = useUiStore((s) => s.multiMode);
  const isPreviewSelected = useUiStore((s) => s.isPreviewSelected);
  const projectStore = useProjectStore((s) => s.projectStore);
  const savedState = useProjectStore((s) => s.savedState);
  const validate = useProjectStore((s) => s.validate);

  const [phase, setPhase] = useState<RunPhase>("config");
  const [scope, setScope] = useState<SyncScope>("all");
  const [issues, setIssues] = useState<string[]>([]);
  const [tally, setTally] = useState<SyncTally | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [existingCollections, setExistingCollections] = useState<ExistingCollection[]>([]);
  const [renames, setRenames] = useState<RenameData | null>(null);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [structuralChanges, setStructuralChanges] = useState<StructuralChange[]>([]);
  const [showAllRenames, setShowAllRenames] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewWasInterrupted, setPreviewWasInterrupted] = useState(false);

  const { conflicts, decisions, loadConflicts, setDecision, runSync } = useSyncSession(projectStore, savedState);

  const skipScales = projectStore.pluginMode === "direct" || projectStore.includeColorScalesCollection === false;

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setPhase("config");
      setTally(null);
      setErrorMsg("");
      setIssues([]);
      setRenames(null);
      setSyncPreview(null);
      setStructuralChanges([]);
      setShowAllRenames(false);
      setScope(skipScales ? "roles" : "all");
      sendToPlugin({ type: "check-collections", state: projectStore, savedState: savedState ?? null });
    }
  }, [isOpen, skipScales]);

  const handlePreviewDone = useCallback(() => {
    setIsPreviewLoading(false);
  }, []);

  const handlePreviewInterrupted = useCallback(() => {
    setPreviewWasInterrupted(true);
  }, []);

  const handleCollectionCheckResult = useCallback(
    (msg: CollectionCheckResultMessage) => {
      setExistingCollections(msg.existing ?? []);
      setRenames(msg.renames ?? null);
      setSyncPreview(msg.syncPreview ?? null);
      setStructuralChanges(msg.structuralChanges ?? []);
      loadConflicts(msg.conflicts ?? []);
    },
    [loadConflicts],
  );

  const handleFinish = useCallback((finishTally: SyncTally, errors: string[] | null) => {
    setTally(finishTally);
    setPhase("success");
    if (errors && errors.length > 0) {
      banner.show({
        id: "run-errors",
        type: "warning",
        title: "Sync completed with errors",
        message: errors.join("\n"),
      });
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setErrorMsg(message);
    setPhase("error");
  }, []);

  const callbacks: BridgeCallbacks = {
    onCollectionCheckResult: handleCollectionCheckResult,
    onFinish: handleFinish,
    onError: handleError,
    onPreviewDone: handlePreviewDone,
    onPreviewInterrupted: handlePreviewInterrupted,
  };
  useFigmaBridge(callbacks);

  function handleConfirmRun() {
    const validationIssues = validate();
    if (validationIssues && validationIssues.length > 0) {
      setIssues(validationIssues);
      setPhase("validation-warning");
      return;
    }
    doRun();
  }

  function doRun() {
    setPhase("loading");
    runSync(scope);
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
  const RENAME_PREVIEW_LIMIT = 5;
  const visibleRenames = showAllRenames ? renameChanges : renameChanges.slice(0, RENAME_PREVIEW_LIMIT);
  const hiddenRenameCount = Math.max(0, renameChanges.length - RENAME_PREVIEW_LIMIT);

  // True while check-collections response hasn't arrived yet
  const isChecking = syncPreview === null;

  // Nothing to sync = no creates, updates, or renames detected
  const nothingToSync = syncPreview !== null && syncPreview.total === 0;

  return (
    <Modal open layer="dialog">
      {/* Config phase */}
      {phase === "config" && (
        <>
          <ModalHeader title="Publish to Figma" subtitle="Generate or update color variables in your Figma file." actions={<Button variant="ghost" size="sm" label="Cancel" onClick={handleCancel} />} />

          {/* Scrollable body — min-h-0 prevents flex children from overflowing footer */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
            {/* Sync preview — skeleton while checking, real content after */}
            <SettingsCard>
              {isChecking ? (
                <div className="flex flex-col gap-2 py-0.5 animate-pulse">
                  <div className="h-[10px] w-24 rounded bg-bg-hover" />
                  <div className="flex gap-2 mt-1">
                    <div className="h-[18px] w-14 rounded-full bg-bg-hover" />
                    <div className="h-[18px] w-16 rounded-full bg-bg-hover" />
                    <div className="h-[18px] w-14 rounded-full bg-bg-hover" />
                  </div>
                </div>
              ) : (
                <>
                  <SectionLabel>What Will Change</SectionLabel>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {syncPreview!.toCreate > 0 && (
                      <Badge variant="success" size="xs">
                        {syncPreview!.toCreate} new
                      </Badge>
                    )}
                    {syncPreview!.toUpdate > 0 && (
                      <Badge variant="accent" size="xs">
                        {syncPreview!.toUpdate} updated
                      </Badge>
                    )}
                    {syncPreview!.toRename > 0 && (
                      <Badge variant="warning" size="xs">
                        {syncPreview!.toRename} renamed
                      </Badge>
                    )}
                    {nothingToSync && <HelperText>Figma variables are already up to date.</HelperText>}
                  </div>
                </>
              )}
            </SettingsCard>

            {/* Structural change warnings — shown once check completes */}
            {!isChecking &&
              structuralChanges.length > 0 &&
              structuralChanges.map((sc) => {
                const isOrphaning = sc.orphanedCollection || sc.kind === "alpha-removed" || sc.kind === "alpha-changed" || sc.kind === "scale-shrunk";
                return (
                  <Callout
                    key={sc.kind}
                    variant={isOrphaning ? "warning" : "info"}
                    title={
                      sc.kind === "mode-direct-to-scale"
                        ? "Mode change: Direct → Scale"
                        : sc.kind === "mode-scale-to-direct"
                          ? "Mode change: Scale → Direct"
                          : sc.kind === "scale-shrunk"
                            ? "Scale length reduced"
                            : sc.kind === "scale-collection-renamed"
                              ? "Scale collection renamed"
                              : sc.kind === "token-collection-renamed"
                                ? "Token collection renamed"
                                : sc.kind === "source-collection-renamed"
                                  ? "Source collection renamed"
                                  : sc.kind === "source-removed"
                                    ? "Source colors disabled"
                                    : sc.kind === "alpha-removed"
                                      ? "Alpha tints disabled"
                                      : sc.kind === "alpha-changed"
                                        ? "Alpha values changed"
                                        : "Scale collection disabled"
                    }
                  >
                    {sc.detail}
                    {sc.orphanedCollection && <span className="block mt-1 text-[10px] font-mono opacity-70">Orphaned: {sc.orphanedCollection}</span>}
                  </Callout>
                );
              })}

            {/* Scope selector */}
            {!skipScales ? (
              <SettingsCard>
                <SmallRow label="Scope" control={<SegmentedControl segments={SCOPE_SEGMENTS} value={scope} onChange={(v) => setScope(v as SyncScope)} />} />
              </SettingsCard>
            ) : (
              <Callout variant="info" title="Direct Sync Enabled">
                Color variables are synced directly. No scales collection will be created.
              </Callout>
            )}

            {/* Name changes — only render once check is done, and only if there are conflicts */}
            {!isChecking && conflicts.length > 0 && (
              <SettingsCard>
                <div className="flex items-center justify-between mb-1">
                  <SectionLabel className="text-warning">Name Changes Detected</SectionLabel>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="xs" label="Keep All Figma" onClick={() => conflicts.forEach((c) => setDecision(c.tokenRef, "keep"))} />
                    <Button variant="ghost" size="xs" label="Apply All" onClick={() => conflicts.forEach((c) => setDecision(c.tokenRef, "revert"))} />
                  </div>
                </div>
                <HelperText className="mb-2">Your plugin settings have changed variable names. Choose whether to update Figma or keep existing names.</HelperText>
                <ConflictList conflicts={conflicts} decisions={decisions} onChange={setDecision} />
              </SettingsCard>
            )}

            {/* Pending renames from savedState diff — only after check */}
            {!isChecking && hasRenames && (
              <SettingsCard>
                <SectionLabel>Pending Renames</SectionLabel>
                <HelperText className="mb-2">
                  {renames!.summary.scaleCount > 0 && `${renames!.summary.scaleCount} scale variable${renames!.summary.scaleCount > 1 ? "s" : ""}`}
                  {renames!.summary.scaleCount > 0 && renames!.summary.tokenCount > 0 && ", "}
                  {renames!.summary.tokenCount > 0 && `${renames!.summary.tokenCount} token variable${renames!.summary.tokenCount > 1 ? "s" : ""}`} will be renamed in-place.
                </HelperText>
                {visibleRenames.map((change, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-0.5">
                    <MicroText className="capitalize">{change.type}:</MicroText>
                    <Mono>{change.from}</Mono>
                    <MicroText>→</MicroText>
                    <Mono className="text-accent">{change.to}</Mono>
                  </div>
                ))}
                {!showAllRenames && hiddenRenameCount > 0 && (
                  <button type="button" className="mt-1 text-[10px] text-accent hover:underline cursor-pointer" onClick={() => setShowAllRenames(true)}>
                    +{hiddenRenameCount} more
                  </button>
                )}
              </SettingsCard>
            )}

            {/* Existing collections — only render once check is done */}
            {!isChecking && existingCollections.length > 0 && (
              <SettingsCard>
                <SectionLabel>Existing Collections</SectionLabel>
                {existingCollections.map((col) => (
                  <div key={col.id} className="flex items-center justify-between py-1 border-b border-border-subtle last:border-0">
                    <CardTitle>{col.name}</CardTitle>
                    <Badge variant="muted" size="xs">
                      Update
                    </Badge>
                  </div>
                ))}
              </SettingsCard>
            )}

            {/* Free-plan multi-mode warning */}
            {!multiMode && projectStore.themes.length > 1 && (
              <Callout variant="warning" title="Only 1 theme will be applied">
                Your Figma plan supports only 1 mode per collection. Only <strong>{projectStore.themes[0]?.name}</strong> will be written.
                {projectStore.themes.slice(1).length > 0 && (
                  <>
                    {" "}
                    Skipped:{" "}
                    {projectStore.themes
                      .slice(1)
                      .map((t) => t.name)
                      .join(", ")}
                    .
                  </>
                )}{" "}
                Upgrade to a paid Figma plan to apply all themes.
              </Callout>
            )}

            {/* Config summary */}
            <SettingsCard>
              <SectionLabel>Summary</SectionLabel>
              <SmallRow label="Colors" control={<StatValue>{projectStore.colors.length}</StatValue>} />
              <SmallRow label="Roles" control={<StatValue>{projectStore.roles.length}</StatValue>} />
              <SmallRow label="Themes" control={<StatValue>{projectStore.themes.length}</StatValue>} />
              <SmallRow label="Variations" control={<StatValue>{(projectStore.variations ?? []).length}</StatValue>} />
              <SmallRow label="Mode" control={<StatValue className="capitalize">{projectStore.pluginMode}</StatValue>} />
            </SettingsCard>
          </div>

          {/* Interrupted warning banner */}
          {previewWasInterrupted && (
            <div className="mx-3 mt-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <span className="text-amber-400 text-xs mt-px shrink-0">⚠</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-300 font-medium">Previous preview was interrupted</p>
                <p className="text-[10px] text-amber-400/70 mt-0.5">The plugin was closed mid-render. Re-run preview to restore the canvas.</p>
              </div>
              <button onClick={() => setPreviewWasInterrupted(false)} className="text-amber-500/50 hover:text-amber-400 text-xs shrink-0 cursor-pointer">
                ✕
              </button>
            </div>
          )}

          {/* Footer — always visible, never pushed off screen */}
          <div className="shrink-0 px-3 py-3 border-t border-border-base flex gap-2 relative">
            {/* Blocking overlay while preview is generating — prevents accidental close */}
            {isPreviewLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-bg-app/80 backdrop-blur-sm rounded">
                <svg className="animate-spin w-3.5 h-3.5 text-accent shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-xs text-text-muted">Generating preview — do not close</span>
              </div>
            )}
            <Button
              variant="secondary"
              size="xl"
              label={isPreviewLoading ? "Generating…" : isPreviewSelected ? "Update Canvas Preview" : "Preview in Canvas"}
              disabled={isPreviewLoading}
              onClick={() => {
                setPreviewWasInterrupted(false);
                setIsPreviewLoading(true);
                sendToPlugin({ type: "run-preview", state: projectStore });
              }}
              className="flex-1"
            />
            <Button
              variant="primary"
              size="xl"
              label="Create / Update Variables"
              onClick={handleConfirmRun}
              disabled={isChecking || nothingToSync}
              title={isChecking ? "Checking Figma collections…" : nothingToSync ? "All variables are already up to date in Figma" : undefined}
              className="flex-1"
            />
          </div>
        </>
      )}

      {/* Validation warning */}
      {phase === "validation-warning" && <ValidationWarningOverlay open issues={issues} onBack={() => setPhase("config")} onContinue={doRun} />}

      {/* Loading */}
      <LoadingOverlay open={phase === "loading"} />

      {/* Success */}
      <SuccessOverlay open={phase === "success"} tally={tally} onDismiss={handleDismissResult} />

      {/* Error */}
      <ErrorOverlay open={phase === "error"} message={errorMsg} onDismiss={handleDismissResult} />
    </Modal>
  );
}
