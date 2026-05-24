import { useAppStore, computeHash } from './appStore';
import type { AppState } from '../types/state';

// ── Settings cancel/done lifecycle ───────────────────────────────────────────
//
// On settings open:  call takeSnapshot() — deep-clones current appState.
// On settings cancel: call restoreSnapshot() — reverts appState to snapshot.
// On settings done:  call clearSnapshot() — discards the snapshot.

let _settingsSnapshot: AppState | null = null;

export function takeSnapshot(): void {
  const { appState } = useAppStore.getState();
  _settingsSnapshot = JSON.parse(JSON.stringify(appState));
}

export function restoreSnapshot(): void {
  if (!_settingsSnapshot) return;
  useAppStore.setState({ appState: JSON.parse(JSON.stringify(_settingsSnapshot)) });
}

export function clearSnapshot(): void {
  _settingsSnapshot = null;
}

export function hasSnapshot(): boolean {
  return _settingsSnapshot !== null;
}

// ── Dirty tracking relative to last Figma sync ───────────────────────────────
//
// isDirty() compares current appState hash against the hash recorded at last
// markClean() call (which happens after a successful Figma sync).

export function isDirty(): boolean {
  return useAppStore.getState().isDirty();
}

export function markClean(): void {
  useAppStore.getState().markClean();
}

// ── Persist to Figma / localStorage ─────────────────────────────────────────

export function persistState(): void {
  const { appState } = useAppStore.getState();
  parent.postMessage({ pluginMessage: { type: 'save-config', state: appState } }, '*');
}

// ── Hash utility (exported for tests) ───────────────────────────────────────

export { computeHash };
