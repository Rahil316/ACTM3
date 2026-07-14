import { useEffect } from "react";
import { useProjectStore } from "../store/projectStore";
import { hasSnapshot } from "../store/snapshots";
import type { ProjectStore } from "../types/state";

// Subscribes to projectStore and auto-saves to the plugin backend on change.
// Debounced at 500ms; flushes synchronously on unmount AND on beforeunload so
// no changes are lost when the plugin window closes before the timer fires —
// React's unmount cleanup alone isn't guaranteed to run when Figma tears down
// the plugin iframe directly (close button, Esc, switching plugins).
// Call this ONCE from App — not from every overlay that uses useFigmaBridge.
// In standalone mode, parent.postMessage is patched by useFigmaBridge to handle
// save-config via localStorage — no special-casing needed here.
//
// While a Settings snapshot is active (dialog open, not yet Cancel/Done'd),
// nothing persists — otherwise closing the plugin mid-edit (or just the 500ms
// debounce firing before you click Cancel) would silently commit changes you
// meant to discard. Cancel reverts and clears the snapshot; Done clears it and
// lets the already-current state save normally on the next change.

export function save(state: ProjectStore): void {
  parent.postMessage({ pluginMessage: { type: "save-config", state } }, "*");
}

export function useAutoSave(): void {
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingState: ProjectStore | null = null;

    const flush = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = null;
      if (pendingState && !hasSnapshot()) {
        save(pendingState);
        pendingState = null;
      }
    };

    const unsubscribe = useProjectStore.subscribe((state, prev) => {
      if (state.projectStore === prev.projectStore) return;
      pendingState = state.projectStore;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (!hasSnapshot()) save(state.projectStore);
        pendingState = null;
        saveTimer = null;
      }, 500);
    });

    window.addEventListener("beforeunload", flush);

    return () => {
      window.removeEventListener("beforeunload", flush);
      unsubscribe();
      flush();
    };
  }, []);
}
