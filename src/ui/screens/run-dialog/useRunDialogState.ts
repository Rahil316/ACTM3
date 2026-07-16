import { useState, useCallback, useEffect, useRef, useDeferredValue } from "react";
import { sendToPlugin, type SyncScope, type SyncTally, type PerCollectionTally, type ExistingCollection, type CollectionCheckResultMessage } from "../../types/messages";
import type { SyncPreview, StructuralChange, SyncPreviewItem } from "../../types/messages";
import type { ProjectStore } from "../../types/state";
import { useSyncSession } from "../../hooks/useSyncSession";

// Re-check debounce: how long to wait after the user stops editing before
// re-sending check-collections. The sandbox round trip reads the whole Figma
// variable document (100-300ms), so this must not fire on every keystroke.
const RECHECK_DEBOUNCE_MS = 600;

// If the sandbox doesn't respond to check-collections within this window,
// something went wrong on the sandbox side (e.g. an uncaught exception before
// it could post a reply) — surface an error instead of leaving the dialog
// stuck in a loading state with no way out but closing it. check-collections
// is a fast, bounded read (100-300ms), so 15s is already generous slack.
const SANDBOX_TIMEOUT_MS = 15000;

// Canvas preview does real, unavoidable Figma node-creation work (potentially
// hundreds of tile instances for a large project) — a legitimately slow but
// successful render was being misreported as a failure at the same 15s used
// for check-collections' much lighter round trip. Extended by a minute.
const PREVIEW_TIMEOUT_MS = 75000;

export type RunPhase =
  | "config"
  | "validation-warning"
  | "loading-sync"
  | "loading-preview"
  | "success"
  | "error";

export type RunDialogTab = "summary" | "changes" | "value-drift" | "health";

export function useRunDialogState(
  projectStore: ProjectStore,
  savedState: ProjectStore | null,
  validate: () => string[] | null,
) {
  const [phase, setPhase] = useState<RunPhase>("config");
  const [activeTab, setActiveTab] = useState<RunDialogTab>("summary");
  const [scope, setScope] = useState<SyncScope>("all");
  const [tally, setTally] = useState<SyncTally | null>(null);
  const [perCollection, setPerCollection] = useState<PerCollectionTally | undefined>(undefined);
  const [syncDurationMs, setSyncDurationMs] = useState<number | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [existingCollections, setExistingCollections] = useState<ExistingCollection[]>([]);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [previewItems, setPreviewItems] = useState<SyncPreviewItem[]>([]);
  const [structuralChanges, setStructuralChanges] = useState<StructuralChange[]>([]);
  const [previewWasInterrupted, setPreviewWasInterrupted] = useState(false);
  // Value-drift detection is on-demand only (see sendCheck's checkValueDrift
  // param) — this tracks whether the CURRENT driftItems/decisions actually
  // reflect a real check, vs. being empty because it was never run. Reset to
  // false on every edit so a stale "checked" state can't be trusted after the
  // config has since changed underneath it.
  const [valueDriftChecked, setValueDriftChecked] = useState(false);
  const [isCheckingValueDrift, setIsCheckingValueDrift] = useState(false);

  const { conflicts, decisions, loadConflicts, setDecision, driftItems, driftDecisions, loadValueDrift, setDriftDecision, runSync } = useSyncSession(projectStore, savedState);

  // Tracks whether the last check-collections response still reflects the
  // current projectStore. Set true the moment projectStore changes after an
  // initial check; cleared once a fresh response comes back.
  const [isStale, setIsStale] = useState(false);
  const hasCheckedOnce = useRef(false);

  // Pending sandbox-round-trip timeout handles — cleared when the matching
  // response arrives, fired (as an onError) if the sandbox never replies.
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // check-collections requests aren't guaranteed to resolve in send order — a
  // rapid edit can fire a second request before the first's round trip
  // finishes, and the sandbox doesn't queue them. Track the latest sent id so
  // a slower, stale response can't overwrite newer diff results in the UI.
  const latestCheckRequestId = useRef(0);

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const sendCheck = useCallback(
    (store: ProjectStore, checkValueDrift = false) => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      const requestId = ++latestCheckRequestId.current;
      checkTimeoutRef.current = setTimeout(() => {
        checkTimeoutRef.current = null;
        setErrorMsg("Figma didn't respond to the collection check in time. Close this dialog and try again.");
        setPhase("error");
      }, SANDBOX_TIMEOUT_MS);
      sendToPlugin({ type: "check-collections", requestId, state: store, savedState: savedState ?? null, checkValueDrift });
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
      setValueDriftChecked(false);
      hasCheckedOnce.current = true;

      // Value-drift stays on-demand even on dialog open — see the "Figma Edits"
      // tab's "Check for Figma Edits" button and handleConfirmRun's mandatory
      // pre-sync check for the two places it actually runs.
      sendCheck(projectStore);
    },
    [projectStore, sendCheck],
  );

  const onCollectionCheckResult = useCallback(
    (msg: CollectionCheckResultMessage) => {
      // Discard responses to superseded requests — a rapid edit can fire a
      // newer check-collections before an older one's round trip finishes, and
      // nothing guarantees they resolve in order. Applying a stale response
      // would flash the UI back to outdated diff results. The outstanding
      // timeout is left untouched here since it belongs to the latest request,
      // which is still genuinely pending.
      if (msg.requestId !== latestCheckRequestId.current) return;

      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      setExistingCollections(msg.existing ?? []);
      setSyncPreview(msg.syncPreview ?? null);
      setPreviewItems(msg.items ?? []);
      setStructuralChanges(msg.structuralChanges ?? []);
      loadConflicts(msg.conflicts ?? []);
      loadValueDrift(msg.valueDrift ?? []);
      setValueDriftChecked(!!msg.valueDriftChecked);
      setIsCheckingValueDrift(false);
      setIsStale(false);
    },
    [loadConflicts, loadValueDrift],
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
    // Any edit invalidates a prior value-drift check — it was computed against
    // a config that no longer matches what's about to be synced.
    setValueDriftChecked(false);
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

  // Every drift/conflict item must have an explicit keep-Figma/use-plugin
  // decision before sync is allowed to proceed — there is no safe default,
  // since either choice can silently discard someone's edit. Name conflicts of
  // kind "conflict" (both Figma and the plugin's suggested name changed since
  // baseline) get the same treatment — "drift"-kind ones are pre-filled with
  // "keep" by loadConflicts and don't block.
  const allDriftDecided = driftItems.every((item) => !!driftDecisions[item.tokenRef]);
  const allNameConflictsDecided = conflicts.every((c) => c.kind !== "conflict" || !!decisions[c.tokenRef]);

  // Value-drift is on-demand (see sendCheck's checkValueDrift param) to avoid
  // recomputing it on every debounced edit — but Sync must never proceed
  // against a stale or never-run drift check, or a Figma-side edit made after
  // the last check could be silently clobbered. First click on an unchecked
  // config only runs the forced check and reveals its results (new drift items
  // load undecided, per useSyncSession's loadValueDrift) — it deliberately does
  // NOT auto-continue into sync once the response lands, since that would mean
  // reasoning about whether React state has settled from an async postMessage
  // reply. The user reviews/decides on the Figma Edits tab, then clicks Sync
  // again; by then valueDriftChecked is true and it proceeds normally.
  const checkValueDrift = useCallback(() => {
    setIsCheckingValueDrift(true);
    sendCheck(projectStore, true);
  }, [projectStore, sendCheck]);

  const handleConfirmRun = useCallback(() => {
    if (!valueDriftChecked) {
      checkValueDrift();
      return;
    }
    if (!allDriftDecided || !allNameConflictsDecided) return;
    const validationIssues = validate();
    if (validationIssues && validationIssues.length > 0) {
      setIssues(validationIssues);
      setPhase("validation-warning");
      return;
    }
    doSync(scope);
  }, [valueDriftChecked, checkValueDrift, allDriftDecided, allNameConflictsDecided, validate, doSync, scope]);

  const handleStartPreview = useCallback(() => {
    setPreviewWasInterrupted(false);
    setPhase("loading-preview");
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    previewTimeoutRef.current = setTimeout(() => {
      previewTimeoutRef.current = null;
      setErrorMsg("Figma didn't respond to the preview request in time. Close this dialog and try again.");
      setPhase("error");
    }, PREVIEW_TIMEOUT_MS);
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

  const onFinish = useCallback((finishTally: SyncTally, errors: string[] | null, finishPerCollection?: PerCollectionTally, finishDurationMs?: number) => {
    setTally(finishTally);
    setPerCollection(finishPerCollection);
    setSyncDurationMs(finishDurationMs);
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
    perCollection,
    syncDurationMs,
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
    allNameConflictsDecided,
    // value-drift resolution (from useSyncSession)
    driftItems,
    driftDecisions,
    setDriftDecision,
    allDriftDecided,
    valueDriftChecked,
    isCheckingValueDrift,
    checkValueDrift,
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
