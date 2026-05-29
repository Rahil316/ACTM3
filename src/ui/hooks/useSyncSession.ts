import { useState, useCallback } from 'react';
import { sendToPlugin, type SyncScope, type NameConflict } from '../types/messages';
import type { AppState } from '../types/state';

export function useSyncSession(appState: AppState, savedState: AppState | null) {
  const [conflicts, setConflicts] = useState<NameConflict[]>([]);
  const [decisions, setDecisions] = useState<Record<string, 'keep' | 'revert'>>({});

  const loadConflicts = useCallback((list: NameConflict[]) => {
    setConflicts(list || []);
    const initialDecisions: Record<string, 'keep' | 'revert'> = {};
    (list || []).forEach((c) => {
      initialDecisions[c.tokenRef] = 'keep';
    });
    setDecisions(initialDecisions);
  }, []);

  const setDecision = useCallback((ref: string, val: 'keep' | 'revert') => {
    setDecisions((prev) => ({ ...prev, [ref]: val }));
  }, []);

  const runSync = useCallback((scope: SyncScope) => {
    sendToPlugin({
      type: 'run-creator',
      state: appState,
      scope,
      savedState: savedState ?? null,
      decisions,
    });
  }, [appState, savedState, decisions]);

  return { conflicts, decisions, loadConflicts, setDecision, runSync };
}
