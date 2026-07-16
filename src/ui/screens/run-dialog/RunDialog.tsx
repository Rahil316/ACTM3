import { useEffect, useState } from "react";
import { useProjectStore } from "../../store/projectStore";
import { useUiStore } from "../../store/uiStore";
import { useFigmaBridge, type BridgeCallbacks } from "../../hooks/useFigmaBridge";
import { useRunDialogState, type RunDialogTab } from "./useRunDialogState";
import { Modal, ModalHeader } from "../../components/Modal";
import { TabBar } from "../../components/TabBar";
import { Button } from "../../components/Button";
import { Badge } from "../../components/Badge";
import { OperationOverlay, SuccessOverlay, ErrorOverlay, ValidationWarningOverlay } from "../../components/ResultOverlay";
import { banner } from "../../store/bannerStore";
import { SummaryTab } from "./tabs/SummaryTab";
import { ChangesTab } from "./tabs/ChangesTab";
import { ValueDriftTab } from "./tabs/ValueDriftTab";
import { HealthTab, type MetricKey } from "./tabs/health/HealthTab";
import { ConflictList } from "../../components/ConflictList";
import type { SyncPreview, SyncScope } from "../../types/messages";

function getSyncLabel(p: SyncPreview): string {
  const { toCreate, toModify, toDelete } = p;
  if (toCreate > 0 && toModify === 0 && toDelete === 0) return "Create Variables";
  if (toCreate === 0 && toModify > 0 && toDelete === 0) return "Update Variables";
  if (toCreate === 0 && toModify === 0 && toDelete > 0) return "Remove Variables";
  return "Sync Variables";
}

export function RunDialog() {
  const isOpen = useUiStore((s) => s.activeOverlay === "run-dialog");
  const closeOverlay = useUiStore((s) => s.closeOverlay);
  const multiMode = useUiStore((s) => s.multiMode);
  const isPreviewSelected = useUiStore((s) => s.isPreviewSelected);
  const projectStore = useProjectStore((s) => s.projectStore);
  const savedState = useProjectStore((s) => s.savedState);
  const validate = useProjectStore((s) => s.validate);

  const skipScales = projectStore.pluginMode === "direct" || projectStore.includeColorScalesCollection === false;

  const dialog = useRunDialogState(projectStore, savedState, validate);

  useEffect(() => {
    if (isOpen) {
      dialog.onDialogOpen(skipScales);
    }
  }, [isOpen, skipScales]);

  const callbacks: BridgeCallbacks = {
    onCollectionCheckResult: dialog.onCollectionCheckResult,
    onFinish: (tally, errors, perCollection, durationMs) => {
      const errs = dialog.onFinish(tally, errors, perCollection, durationMs);
      if (errs && errs.length > 0) {
        banner.show({
          id: "run-errors",
          type: "warning",
          title: "Sync completed with errors",
          message: errs.join("\n"),
        });
      }
    },
    onError: dialog.onError,
    onPreviewDone: dialog.onPreviewDone,
    onPreviewInterrupted: dialog.onPreviewInterrupted,
  };
  useFigmaBridge(callbacks);

  const [changesFilter, setChangesFilter] = useState<"all" | "create" | "modify" | "delete">("all");
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [healthMetric, setHealthMetric] = useState<MetricKey>("adjustments");

  if (!isOpen) return null;

  const { syncPreview, previewItems, structuralChanges, conflicts, decisions, existingCollections, isStale, driftItems, driftDecisions, setDriftDecision, allDriftDecided, allNameConflictsDecided, valueDriftChecked, isCheckingValueDrift, checkValueDrift } = dialog;

  // isChecking: no result yet at all (initial load). isStale: we have a
  // result, but the project has changed since and a re-check is pending —
  // both states render the same "checking" skeleton and disable sync so the
  // user never acts on counts that no longer match the live config.
  const isChecking = syncPreview === null;
  const isCheckingOrStale = isChecking || isStale;

  // A "modify" item whose ONLY changed field is name, decided "keep" (i.e. the
  // user is keeping Figma's existing name), writes nothing — figmaVars.ts's
  // upsertVariables skips the rename when decision === "keep". Same logic for
  // the separate NameConflict list: "keep" is a no-op write, but ONLY when it
  // was actually chosen (explicitly, or via the "drift" kind's safe default) —
  // an undecided "conflict"-kind item must NOT be treated as a no-op here, or
  // "Up to Date" would misreport a sync that's actually blocked pending a
  // decision (allNameConflictsDecided handles the real block; this only affects
  // the label/nothingToSync messaging).
  const isNameOnlyKept = (item: { kind: string; changedFields?: string[]; tokenRef: string }) =>
    item.kind === "modify" && item.changedFields?.length === 1 && item.changedFields[0] === "name" && (decisions[item.tokenRef] ?? "keep") === "keep";
  // "drift" conflicts are pre-filled "keep" by loadConflicts; "conflict" ones are
  // guaranteed decided by this point (allNameConflictsDecided gates the button
  // before nothingToSync's value even matters), so decisions[tokenRef] is always
  // populated here — a real pending write is anything other than "keep".
  const pendingConflicts = conflicts.filter((c) => decisions[c.tokenRef] !== "keep");
  const nothingToSync = !isCheckingOrStale && allNameConflictsDecided && syncPreview!.items.every(isNameOnlyKept) && pendingConflicts.length === 0;

  const syncLabel = isCheckingOrStale ? "Checking…" : isCheckingValueDrift ? "Checking Figma Edits…" : !valueDriftChecked ? "Check for Figma Edits" : nothingToSync ? "Up to Date" : getSyncLabel(syncPreview!);

  const configSummary = `${projectStore.colors.length} color${projectStore.colors.length !== 1 ? "s" : ""} · ${projectStore.roles.length} role${projectStore.roles.length !== 1 ? "s" : ""} · ${projectStore.themes.length} theme${projectStore.themes.length !== 1 ? "s" : ""} · ${projectStore.pluginMode} mode`;

  const changesLabel = conflicts.length > 0 ? <span className="flex items-center gap-1">Changes </span> : "Changes";

  const healthLabel =
    structuralChanges.length > 0 ? (
      <span className="flex items-center gap-1">
        Health{" "}
        <Badge variant="warning" size="xs">
          !
        </Badge>
      </span>
    ) : (
      "Health"
    );

  const valueDriftLabel =
    valueDriftChecked && driftItems.length > 0 ? (
      <span className="flex items-center gap-1">
        Figma Edits{" "}
        <Badge variant={allDriftDecided ? "warning" : "danger"} size="xs">
          {driftItems.length}
        </Badge>
      </span>
    ) : !valueDriftChecked ? (
      <span className="flex items-center gap-1">
        Figma Edits{" "}
        <Badge variant="muted" size="xs">
          ?
        </Badge>
      </span>
    ) : (
      "Figma Edits"
    );

  const tabs: { value: RunDialogTab; label: React.ReactNode }[] = [
    { value: "summary", label: "Summary" },
    { value: "changes", label: changesLabel },
    { value: "value-drift", label: valueDriftLabel },
    { value: "health", label: healthLabel },
  ];

  return (
    <Modal open layer="dialog">
      {/* Config phase */}
      {dialog.phase === "config" && (
        <>
          <ModalHeader title="Publish to Figma" subtitle={configSummary} actions={<Button variant="ghost" size="sm" label="Cancel" onClick={closeOverlay} />} />

          {/* Tab bar */}
          <div className="shrink-0 px-3 pt-2 pb-0 border-b border-n-br-default">
            <TabBar tabs={tabs} active={dialog.activeTab} onChange={dialog.setActiveTab} className="pb-2" />
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {dialog.activeTab === "summary" && (
              <SummaryTab
                syncPreview={syncPreview}
                isChecking={isCheckingOrStale}
                nothingToSync={nothingToSync}
                structuralChanges={structuralChanges}
                existingCollections={existingCollections}
                conflicts={conflicts}
                multiMode={multiMode}
                themes={projectStore.themes}
                pluginMode={projectStore.pluginMode || "scale"}
                skipScales={skipScales}
                scope={dialog.scope}
                setScope={(v) => dialog.setScope(v as SyncScope)}
                previewWasInterrupted={dialog.previewWasInterrupted}
                setPreviewWasInterrupted={dialog.setPreviewWasInterrupted}
                setActiveTab={dialog.setActiveTab}
                setChangesFilter={setChangesFilter}
                setHealthMetric={setHealthMetric}
                onOpenConflicts={() => setConflictsOpen(true)}
              />
            )}

            {dialog.activeTab === "changes" && <ChangesTab previewItems={previewItems} conflicts={conflicts} decisions={decisions} setDecision={dialog.setDecision} total={syncPreview?.total ?? 0} isChecking={isCheckingOrStale} initialFilter={changesFilter} onOpenConflicts={() => setConflictsOpen(true)} />}

            {dialog.activeTab === "value-drift" && (
              <ValueDriftTab items={driftItems} decisions={driftDecisions} setDecision={setDriftDecision} isChecking={isCheckingOrStale} checked={valueDriftChecked} isCheckingDrift={isCheckingValueDrift} onCheck={checkValueDrift} />
            )}

            {dialog.activeTab === "health" && <HealthTab initialMetric={healthMetric} />}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-3 py-3 border-t border-n-br-default flex gap-2">
            <Button variant="secondary" size="xl" label={isPreviewSelected ? "Update Canvas Preview" : "Preview in Canvas"} onClick={dialog.handleStartPreview} className="flex-1" />
            <Button
              variant="primary"
              size="xl"
              label={syncLabel}
              onClick={dialog.handleConfirmRun}
              disabled={isCheckingOrStale || isCheckingValueDrift || (valueDriftChecked && (nothingToSync || !allDriftDecided || !allNameConflictsDecided))}
              title={
                isCheckingOrStale
                  ? "Checking Figma collections…"
                  : isCheckingValueDrift
                    ? "Checking for edits made directly in Figma…"
                    : !valueDriftChecked
                      ? "Checks whether any variable was edited directly in Figma since the last sync, then lets you sync"
                      : nothingToSync
                        ? "All variables are already up to date in Figma"
                        : !allDriftDecided
                          ? "Resolve all Figma edits in the \"Figma Edits\" tab before syncing"
                          : !allNameConflictsDecided
                            ? "Resolve all naming conflicts before syncing"
                            : undefined
              }
              className="flex-1"
            />
          </div>

          {/* Conflict resolution sheet — rendered at modal root so Sheet slides within the dialog */}
          <ConflictList
            open={conflictsOpen}
            onClose={() => setConflictsOpen(false)}
            conflicts={conflicts}
            decisions={decisions}
            onChange={(ref, val) => dialog.setDecision(ref, val as "keep" | "revert")}
            onKeepAll={() => conflicts.forEach((c) => dialog.setDecision(c.tokenRef, "keep"))}
            onOverrideAll={() => conflicts.forEach((c) => dialog.setDecision(c.tokenRef, "revert"))}
          />
        </>
      )}

      {/* Validation warning */}
      {dialog.phase === "validation-warning" && <ValidationWarningOverlay open issues={dialog.issues} onBack={dialog.backToConfig} onContinue={dialog.continueAfterValidation} />}

      {/* Loading — sync */}
      <OperationOverlay open={dialog.phase === "loading-sync"} kind="sync" />

      {/* Loading — preview */}
      <OperationOverlay open={dialog.phase === "loading-preview"} kind="preview" />

      {/* Success */}
      <SuccessOverlay
        open={dialog.phase === "success"}
        tally={dialog.tally}
        perCollection={dialog.perCollection}
        durationMs={dialog.syncDurationMs}
        collectionNames={{
          scale: projectStore.scaleCollectionName,
          token: projectStore.tokenCollectionName,
          source: projectStore.sourceCollectionName,
        }}
        onDismiss={closeOverlay}
      />

      {/* Error */}
      <ErrorOverlay open={dialog.phase === "error"} message={dialog.errorMsg} onDismiss={closeOverlay} />
    </Modal>
  );
}
