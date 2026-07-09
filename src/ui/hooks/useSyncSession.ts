import { useState, useCallback } from "react";
import { sendToPlugin, type SyncScope, type SyncDecision, type NameConflict } from "../types/messages";
import type { ProjectStore } from "../types/state";

export function useSyncSession(projectStore: ProjectStore, savedState: ProjectStore | null) {
  const [conflicts, setConflicts] = useState<NameConflict[]>([]);
  const [decisions, setDecisions] = useState<Record<string, SyncDecision>>({});

  const loadConflicts = useCallback((list: NameConflict[]) => {
    setConflicts(list || []);
    const initialDecisions: Record<string, SyncDecision> = {};
    (list || []).forEach((c) => {
      initialDecisions[c.tokenRef] = "keep";
    });
    setDecisions(initialDecisions);
  }, []);

  const setDecision = useCallback((ref: string, val: SyncDecision) => {
    setDecisions((prev) => ({ ...prev, [ref]: val }));
  }, []);

  const runSync = useCallback(
    (scope: SyncScope) => {
      sendToPlugin({
        type: "run-creator",
        state: projectStore,
        scope,
        savedState: savedState ?? null,
        decisions,
      });
    },
    [projectStore, savedState, decisions],
  );

  return { conflicts, decisions, loadConflicts, setDecision, runSync };
}
