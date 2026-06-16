import { useEffect } from "react";
import { useProjectStore } from "../store/projectStore";
import type { ProjectStore } from "../types/state";

// Subscribes to projectStore and auto-saves to the plugin backend on change.
// Debounced at 500ms; flushes synchronously on cleanup so no changes are lost
// when the plugin closes before the timer fires.
// Call this ONCE from App — not from every overlay that uses useFigmaBridge.
// In standalone mode, parent.postMessage is patched by useFigmaBridge to handle
// save-config via localStorage — no special-casing needed here.

function save(state: ProjectStore): void {
  parent.postMessage({ pluginMessage: { type: "save-config", state } }, "*");
}

export function useAutoSave(): void {
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingState: ProjectStore | null = null;

    const unsubscribe = useProjectStore.subscribe((state, prev) => {
      if (state.projectStore === prev.projectStore) return;
      pendingState = state.projectStore;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        save(state.projectStore);
        pendingState = null;
        saveTimer = null;
      }, 500);
    });

    return () => {
      unsubscribe();
      if (saveTimer) {
        clearTimeout(saveTimer);
        if (pendingState) save(pendingState);
      }
    };
  }, []);
}
