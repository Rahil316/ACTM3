import { useProjectStore, computeHash } from "./projectStore";
import type { ProjectStore } from "../types/state";

// ── Settings cancel/done lifecycle ───────────────────────────────────────────
//
// On settings open:  call takeSnapshot() — deep-clones current projectStore.
// On settings cancel: call restoreSnapshot() — reverts projectStore to snapshot.
// On settings done:  call clearSnapshot() — discards the snapshot.

let _settingsSnapshot: ProjectStore | null = null;

export function takeSnapshot(): void {
  const { projectStore } = useProjectStore.getState();
  _settingsSnapshot = JSON.parse(JSON.stringify(projectStore));
}

export function restoreSnapshot(): void {
  if (!_settingsSnapshot) return;
  useProjectStore.setState({ projectStore: JSON.parse(JSON.stringify(_settingsSnapshot)) });
}

export function clearSnapshot(): void {
  _settingsSnapshot = null;
}

export function hasSnapshot(): boolean {
  return _settingsSnapshot !== null;
}

// ── Dirty tracking relative to last Figma sync ───────────────────────────────
//
// isDirty() compares current projectStore hash against the hash recorded at last
// markClean() call (which happens after a successful Figma sync).

export function isDirty(): boolean {
  return useProjectStore.getState().isDirty();
}

export function markClean(): void {
  useProjectStore.getState().markClean();
}

// ── Hash utility (exported for tests) ───────────────────────────────────────

export { computeHash };
