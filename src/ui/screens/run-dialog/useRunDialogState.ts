import { useState, useCallback, useEffect, useRef } from "react";
import { sendToPlugin, type SyncScope, type SyncTally, type PerCollectionTally, type ExistingCollection, type CollectionCheckResultMessage } from "../../types/messages";
import type { SyncPreview, StructuralChange, SyncPreviewItem } from "../../types/messages";
import type { ProjectStore } from "../../types/state";
import { useSyncSession } from "../../hooks/useSyncSession";

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

  // Pending sandbox-round-trip timeout handles — cleared when the matching
  // response arrives, fired (as an onError) if the sandbox never replies.
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // check-collections requests aren't guaranteed to resolve in send order — a
  // rapid edit can fire a second request before the first's round trip
  // finishes, and the sandbox doesn't queue them. Track the latest sent id so
  // a slower, stale response can't overwrite newer diff results in the UI.
  const latestCheckRequestId = useRef(0);

  // Set once a check-collections response for the CURRENT dialog session has
  // landed. There is no automatic re-check on open or on edit — the user
  // triggers it explicitly (the "Compare Changes with Figma" button in
  // Summary's What Will Change section, which becomes a refresh icon once
  // this is true), and it's forced once more, silently, right before an
  // actual sync (see handleConfirmRun) so a stale review can't be published
  // against unreviewed drift.
  const [hasChecked, setHasChecked] = useState(false);
  // True only while the pre-publish silent re-check (not a user-initiated
  // click) is in flight — lets the footer button show a distinct "Verifying…"
  // state instead of reusing isChecking's "not checked yet" messaging.
  const [isPrePublishChecking, setIsPrePublishChecking] = useState(false);
  // Wall-clock time of the last check-collections response, so the UI can show
  // "checked Xs ago" near the refresh icon — otherwise a stale-but-hasChecked
  // state (user checked, then walked away and edited a lot) looks identical to
  // a fresh one until they actually click Sync and hit the pre-publish gate.
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  // Set (with a reason) when the silent pre-publish re-check finds something
  // new and reroutes the user to a different tab — surfaced as a one-shot
  // banner (RunDialog.tsx) so the jump doesn't look unexplained. Cleared once
  // shown; not part of persistent state.
  const [prePublishReroute, setPrePublishReroute] = useState<"conflict" | "drift" | null>(null);

  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, []);

  const sendCheck = useCallback(
    (store: ProjectStore) => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      const requestId = ++latestCheckRequestId.current;
      checkTimeoutRef.current = setTimeout(() => {
        checkTimeoutRef.current = null;
        setErrorMsg("Figma didn't respond to the collection check in time. Close this dialog and try again.");
        setPhase("error");
      }, SANDBOX_TIMEOUT_MS);
      // Always requests value-drift together with the collection/conflict
      // check — one user action (or the silent pre-publish check) answers
      // both "what will change" and "did Figma drift" in a single round trip,
      // rather than requiring two separate clicks across two tabs.
      sendToPlugin({ type: "check-collections", requestId, state: store, savedState: savedState ?? null, checkValueDrift: true });
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
      setValueDriftChecked(false);
      setHasChecked(false);
      setLastCheckedAt(null);
      setPrePublishReroute(null);
      // No automatic check here — the user must click "Compare Changes with
      // Figma" in Summary (or Sync, which forces it first). Nothing is sent
      // to the sandbox just from opening the dialog.
    },
    [],
  );

  const clearPrePublishReroute = useCallback(() => setPrePublishReroute(null), []);

  // User-triggered (or programmatically re-triggered) check — the only way
  // syncPreview/conflicts/structuralChanges/driftItems get populated now that
  // there's no auto-check on open or on edit.
  const checkNow = useCallback(() => {
    sendCheck(projectStore);
  }, [projectStore, sendCheck]);

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
      setHasChecked(true);
      setLastCheckedAt(Date.now());

      // If this response landed while a silent pre-publish re-check was in
      // flight (see handleConfirmRun), decide right here whether it's safe to
      // proceed straight to sync, or whether the fresh data surfaced something
      // new that needs the user's attention first.
      if (prePublishCheckRef.current) {
        prePublishCheckRef.current = false;
        setIsPrePublishChecking(false);
        const freshConflicts = msg.conflicts ?? [];
        const freshDrift = msg.valueDrift ?? [];
        // Mirror allNameConflictsDecided/allDriftDecided exactly, but against
        // the FRESH response rather than the (possibly stale-by-one-render)
        // decisions/driftDecisions closures — loadConflicts/loadValueDrift
        // above preserve a decision for any tokenRef still present in the new
        // list, so decisionsRef/driftDecisionsRef (captured just before this
        // check fired, see handleConfirmRun) already reflect what survives.
        const hasBlockingConflict = freshConflicts.some((c) => c.kind === "conflict" && !decisionsRef.current[c.tokenRef]);
        const hasUndecidedDrift = freshDrift.some((d) => !driftDecisionsRef.current[d.tokenRef]);
        if (hasBlockingConflict || hasUndecidedDrift) {
          // Something changed on Figma's side between the user's last review
          // and this very moment — never silently overwrite it. Land the user
          // on whichever tab has the new thing to resolve, and record why so
          // RunDialog can explain the jump instead of it looking unexplained.
          setActiveTab(hasUndecidedDrift ? "value-drift" : "changes");
          setPrePublishReroute(hasUndecidedDrift ? "drift" : "conflict");
          return;
        }
        proceedToSyncRef.current?.();
      }
    },
    [loadConflicts, loadValueDrift],
  );

  // Kept in sync via effect below so onCollectionCheckResult's pre-publish
  // branch (above) can read the latest decisions/driftDecisions without
  // needing them in its own dependency array (which would recreate the
  // callback — and thus risk detaching/reattaching the bridge listener —
  // every time the user makes an unrelated decision elsewhere in the dialog).
  const decisionsRef = useRef(decisions);
  const driftDecisionsRef = useRef(driftDecisions);
  useEffect(() => {
    decisionsRef.current = decisions;
  }, [decisions]);
  useEffect(() => {
    driftDecisionsRef.current = driftDecisions;
  }, [driftDecisions]);

  // Set just before sendCheck fires for the pre-publish gate (handleConfirmRun),
  // cleared as soon as that response is handled above — distinguishes "this
  // response is the silent final check" from "this response is a normal
  // user-triggered checkNow()", since both flow through the same message type.
  const prePublishCheckRef = useRef(false);
  // Holds the "actually run doSync" closure so onCollectionCheckResult (above)
  // can call it once the fresh pre-publish check comes back clean, without
  // onCollectionCheckResult needing doSync/validate/scope in its own deps.
  const proceedToSyncRef = useRef<(() => void) | null>(null);

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

  // Re-check triggered from the "Figma Edits" tab's own button — same combined
  // check as checkNow, kept as a separate name since existing callers expect
  // this signature (no args) and isCheckingValueDrift's distinct loading state.
  const checkValueDrift = useCallback(() => {
    setIsCheckingValueDrift(true);
    sendCheck(projectStore);
  }, [projectStore, sendCheck]);

  // Runs the actual validate → doSync sequence. Split out so both the normal
  // path and the post-pre-publish-check path (via proceedToSyncRef, see
  // onCollectionCheckResult above) can reach it identically.
  const runValidateAndSync = useCallback(() => {
    const validationIssues = validate();
    if (validationIssues && validationIssues.length > 0) {
      setIssues(validationIssues);
      setPhase("validation-warning");
      return;
    }
    doSync(scope);
  }, [validate, doSync, scope]);

  useEffect(() => {
    proceedToSyncRef.current = runValidateAndSync;
  }, [runValidateAndSync]);

  const handleConfirmRun = useCallback(() => {
    // Never checked this session — the first click only runs the combined
    // check (collections + value-drift) and reveals results; it deliberately
    // does NOT auto-continue into sync once the response lands, since that
    // would mean reasoning about whether React state has settled from an
    // async postMessage reply. The user reviews/decides, then clicks again.
    if (!hasChecked) {
      checkNow();
      return;
    }
    if (!allDriftDecided || !allNameConflictsDecided) return;

    // Everything the user has seen is decided — but Figma's own state could
    // have drifted in the time since that last check (someone editing the
    // variables panel directly, another session syncing the same file, etc).
    // Run one more check, silently, right before the real write. If it comes
    // back clean, onCollectionCheckResult's prePublishCheckRef branch calls
    // proceedToSyncRef straight through. If it finds something new, that same
    // branch routes the user to resolve it instead of proceeding — this
    // handleConfirmRun call ends here either way; the follow-through happens
    // from onCollectionCheckResult once the response actually arrives.
    prePublishCheckRef.current = true;
    setIsPrePublishChecking(true);
    sendCheck(projectStore);
  }, [hasChecked, checkNow, allDriftDecided, allNameConflictsDecided, projectStore, sendCheck]);

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
    hasChecked,
    isPrePublishChecking,
    checkNow,
    lastCheckedAt,
    prePublishReroute,
    clearPrePublishReroute,
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
