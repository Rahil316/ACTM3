import { useState, useCallback } from "react";
import { sendToPlugin, type SyncScope, type SyncDecision, type NameConflict, type DriftDecision, type ValueDriftItem } from "../types/messages";
import type { ProjectStore } from "../types/state";
import { defaultNameConflictDecision } from "../utils/nameConflicts";

export function useSyncSession(projectStore: ProjectStore, savedState: ProjectStore | null) {
  const [conflicts, setConflicts] = useState<NameConflict[]>([]);
  const [decisions, setDecisions] = useState<Record<string, SyncDecision>>({});

  // Value-drift decisions start UNDECIDED (no default). Sync must be blocked
  // until every drift/conflict item has an explicit choice, so there is no
  // safe default to fall back on.
  const [driftItems, setDriftItems] = useState<ValueDriftItem[]>([]);
  const [driftDecisions, setDriftDecisions] = useState<Record<string, DriftDecision>>({});

  const loadConflicts = useCallback((list: NameConflict[]) => {
    setConflicts(list || []);
    const initialDecisions: Record<string, SyncDecision> = {};
    (list || []).forEach((c) => {
      const def = defaultNameConflictDecision(c.kind);
      if (def) initialDecisions[c.tokenRef] = def;
    });
    setDecisions(initialDecisions);
  }, []);

  const setDecision = useCallback((ref: string, val: SyncDecision) => {
    setDecisions((prev) => ({ ...prev, [ref]: val }));
  }, []);

  // Replaces the drift list wholesale on every check-collections response.
  // Decisions for tokenRefs that are still present are preserved; decisions
  // for tokenRefs no longer drifted (resolved/removed) are dropped.
  const loadValueDrift = useCallback((list: ValueDriftItem[]) => {
    setDriftItems(list || []);
    setDriftDecisions((prev) => {
      const next: Record<string, DriftDecision> = {};
      for (const item of list || []) {
        if (prev[item.tokenRef]) next[item.tokenRef] = prev[item.tokenRef];
      }
      return next;
    });
  }, []);

  const setDriftDecision = useCallback((ref: string, val: DriftDecision) => {
    setDriftDecisions((prev) => ({ ...prev, [ref]: val }));
  }, []);

  const runSync = useCallback(
    (scope: SyncScope) => {
      sendToPlugin({
        type: "run-creator",
        state: projectStore,
        scope,
        savedState: savedState ?? null,
        decisions,
        driftDecisions,
      });
    },
    [projectStore, savedState, decisions, driftDecisions],
  );

  return { conflicts, decisions, loadConflicts, setDecision, driftItems, driftDecisions, loadValueDrift, setDriftDecision, runSync };
}
