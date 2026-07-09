import { useState, useCallback } from "react";
import { sendToPlugin, type SyncScope, type SyncTally, type ExistingCollection, type CollectionCheckResultMessage } from "../../types/messages";
import type { SyncPreview, StructuralChange, SyncPreviewItem } from "../../types/messages";
import type { ProjectStore } from "../../types/state";
import { useSyncSession } from "../../hooks/useSyncSession";

export type RunPhase =
  | "config"
  | "validation-warning"
  | "loading-sync"
  | "loading-preview"
  | "success"
  | "error";

export type RunDialogTab = "summary" | "changes" | "health";

export function useRunDialogState(
  projectStore: ProjectStore,
  savedState: ProjectStore | null,
  validate: () => string[] | null,
) {
  const [phase, setPhase] = useState<RunPhase>("config");
  const [activeTab, setActiveTab] = useState<RunDialogTab>("summary");
  const [scope, setScope] = useState<SyncScope>("all");
  const [tally, setTally] = useState<SyncTally | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [existingCollections, setExistingCollections] = useState<ExistingCollection[]>([]);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [previewItems, setPreviewItems] = useState<SyncPreviewItem[]>([]);
  const [structuralChanges, setStructuralChanges] = useState<StructuralChange[]>([]);
  const [previewWasInterrupted, setPreviewWasInterrupted] = useState(false);

  const { conflicts, decisions, loadConflicts, setDecision, runSync } = useSyncSession(projectStore, savedState);

  const onDialogOpen = useCallback(
    (skipScales: boolean) => {
      setPhase("config");
      setActiveTab("summary");
      setTally(null);
      setErrorMsg("");
      setIssues([]);
      setSyncPreview(null);
      setPreviewItems([]);
      setStructuralChanges([]);
      setPreviewWasInterrupted(false);
      setScope(skipScales ? "roles" : "all");

      sendToPlugin({ type: "check-collections", state: projectStore, savedState: savedState ?? null });
    },
    [projectStore, savedState],
  );

  const onCollectionCheckResult = useCallback(
    (msg: CollectionCheckResultMessage) => {
      setExistingCollections(msg.existing ?? []);
      setSyncPreview(msg.syncPreview ?? null);
      setPreviewItems(msg.items ?? []);
      setStructuralChanges(msg.structuralChanges ?? []);
      loadConflicts(msg.conflicts ?? []);
    },
    [loadConflicts],
  );

  const doSync = useCallback(
    (syncScope: SyncScope) => {
      setPhase("loading-sync");
      runSync(syncScope);
    },
    [runSync],
  );

  const handleConfirmRun = useCallback(() => {
    const validationIssues = validate();
    if (validationIssues && validationIssues.length > 0) {
      setIssues(validationIssues);
      setPhase("validation-warning");
      return;
    }
    doSync(scope);
  }, [validate, doSync, scope]);

  const handleStartPreview = useCallback(() => {
    setPreviewWasInterrupted(false);
    setPhase("loading-preview");
    sendToPlugin({ type: "run-preview", state: projectStore });
  }, [projectStore]);

  const onPreviewDone = useCallback(() => {
    setPhase("config");
  }, []);

  const onPreviewInterrupted = useCallback(() => {
    setPreviewWasInterrupted(true);
    setPhase("config");
  }, []);

  const onFinish = useCallback((finishTally: SyncTally, errors: string[] | null) => {
    setTally(finishTally);
    setPhase("success");
    return errors;
  }, []);

  const onError = useCallback((message: string) => {
    setErrorMsg(message);
    setPhase("error");
  }, []);

  const backToConfig = useCallback(() => setPhase("config"), []);

  const continueAfterValidation = useCallback(() => doSync(scope), [doSync, scope]);

  return {
    // phase + tab
    phase,
    activeTab,
    setActiveTab,
    // config
    scope,
    setScope,
    // results
    tally,
    errorMsg,
    issues,
    // check-collections data
    existingCollections,
    syncPreview,
    previewItems,
    structuralChanges,
    previewWasInterrupted,
    setPreviewWasInterrupted: (v: boolean) => setPreviewWasInterrupted(v),
    // conflict resolution (from useSyncSession)
    conflicts,
    decisions,
    setDecision,
    // actions
    onDialogOpen,
    onCollectionCheckResult,
    handleConfirmRun,
    handleStartPreview,
    onPreviewDone,
    onPreviewInterrupted,
    onFinish,
    onError,
    backToConfig,
    continueAfterValidation,
  };
}
