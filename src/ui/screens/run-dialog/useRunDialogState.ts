import { useState, useCallback, useEffect, useRef, useDeferredValue } from "react";
import { sendToPlugin, type SyncScope, type SyncTally, type ExistingCollection, type CollectionCheckResultMessage } from "../../types/messages";
import type { SyncPreview, StructuralChange, SyncPreviewItem } from "../../types/messages";
import type { ProjectStore } from "../../types/state";
import { useSyncSession } from "../../hooks/useSyncSession";

// Re-check debounce: how long to wait after the user stops editing before
// re-sending check-collections. The sandbox round trip reads the whole Figma
// variable document (100-300ms), so this must not fire on every keystroke.
const RECHECK_DEBOUNCE_MS = 600;

// If the sandbox doesn't respond to check-collections or run-preview within
// this window, something went wrong on the sandbox side (e.g. an uncaught
// exception before it could post a reply) — surface an error instead of
// leaving the dialog stuck in a loading state with no way out but closing it.
const SANDBOX_TIMEOUT_MS = 15000;

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

  // Tracks whether the last check-collections response still reflects the
  // current projectStore. Set true the moment projectStore changes after an
  // initial check; cleared once a fresh response comes back.
  const [isStale, setIsStale] = useState(false);
  const hasCheckedOnce = useRef(false);

  // Pending sandbox-round-trip timeout handles — cleared when the matching
  // response arrives, fired (as an onError) if the sandbox never replies.
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const sendCheck = useCallback(
    (store: ProjectStore) => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = setTimeout(() => {
        checkTimeoutRef.current = null;
        setErrorMsg("Figma didn't respond to the collection check in time. Close this dialog and try again.");
        setPhase("error");
      }, SANDBOX_TIMEOUT_MS);
      sendToPlugin({ type: "check-collections", state: store, savedState: savedState ?? null });
    },
    [savedState],
  );

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
      setIsStale(false);
      hasCheckedOnce.current = true;

      sendCheck(projectStore);
    },
    [projectStore, sendCheck],
  );

  const onCollectionCheckResult = useCallback(
    (msg: CollectionCheckResultMessage) => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      setExistingCollections(msg.existing ?? []);
      setSyncPreview(msg.syncPreview ?? null);
      setPreviewItems(msg.items ?? []);
      setStructuralChanges(msg.structuralChanges ?? []);
      loadConflicts(msg.conflicts ?? []);
      setIsStale(false);
    },
    [loadConflicts],
  );

  // Re-check debounced: whenever projectStore changes while the dialog is
  // sitting in the config phase (the only phase the user can still edit
  // colors/roles/themes from underneath), mark the current syncPreview/
  // conflicts/structuralChanges as stale and re-send check-collections after
  // a short debounce. Without this, Summary/Changes tabs silently show
  // counts computed against a project state the user has since changed.
  const deferredProjectStore = useDeferredValue(projectStore);
  useEffect(() => {
    if (phase !== "config" || !hasCheckedOnce.current) return;
    setIsStale(true);
    const timer = setTimeout(() => {
      sendCheck(deferredProjectStore);
    }, RECHECK_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [deferredProjectStore, phase, sendCheck]);

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
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      previewTimeoutRef.current = null;
      setErrorMsg("Figma didn't respond to the preview request in time. Close this dialog and try again.");
      setPhase("error");
    }, SANDBOX_TIMEOUT_MS);
    sendToPlugin({ type: "run-preview", state: projectStore });
  }, [projectStore]);

  const onPreviewDone = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    setPhase("config");
  }, []);

  const onPreviewInterrupted = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
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
    isStale,
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
