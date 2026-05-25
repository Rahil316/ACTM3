import { useEffect, useRef } from 'react';
import { useAppStore, makeBootstrapState, ensureIds, ensureVariations } from '../store/appStore';
import { banner } from '../store/bannerStore';
import { useUiStore } from '../store/uiStore';
import { VALID_SCALES, VALID_THEMES, VALID_LANGUAGES } from '../store/uiStore';
import type { PluginToUiMessage, CollectionCheckResultMessage, SyncTally } from '../types/messages';
import type { AppState, UiPrefs } from '../types/state';

// ── Standalone browser mock ──────────────────────────────────────────────────
// When running in a plain browser (window.parent === window) the Figma plugin
// thread is not present. We mock responses so dev/testing works without Figma.

const isStandalone = window.parent === window;

function standaloneHandleOutgoing(msg: { pluginMessage: { type: string; [key: string]: unknown } }): void {
  const pm = msg.pluginMessage;

  if (pm.type === 'check-collections') {
    setTimeout(() => {
      window.postMessage({
        pluginMessage: {
          type: 'collection-check-result',
          existing: [],
          renames: { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } },
        },
      }, '*');
    }, 50);
    return;
  }

  if (pm.type === 'run-creator') {
    localStorage.setItem('tw_state', JSON.stringify(pm.state));
    setTimeout(() => {
      window.postMessage({
        pluginMessage: {
          type: 'finish',
          tally: { created: 12, updated: 4, renamed: 0, failed: 0 },
          errors: null,
          result: null,
        },
      }, '*');
    }, 1000);
    return;
  }

  if (pm.type === 'save-config') {
    localStorage.setItem('tw_state', JSON.stringify(pm.state));
    return;
  }

  if (pm.type === 'save-ui-prefs-meta') {
    localStorage.setItem('uiPrefsMeta', JSON.stringify(pm.prefs));
    return;
  }

  if (pm.type === 'resize') {
    localStorage.setItem('uiSize', JSON.stringify({ width: pm.width, height: pm.height }));
    return;
  }
}

// Patch postMessage in standalone mode so outgoing messages are intercepted
if (isStandalone) {
  const _origPost = window.parent.postMessage.bind(window.parent);
  window.parent.postMessage = (data: unknown, ...args: unknown[]) => {
    if (data && typeof data === 'object' && 'pluginMessage' in (data as object)) {
      standaloneHandleOutgoing(data as { pluginMessage: { type: string; [key: string]: unknown } });
      return;
    }
    (_origPost as (...a: unknown[]) => void)(data, ...args);
  };
}

// ── Boot: load state from localStorage in standalone mode ────────────────────

function bootStandalone(): void {
  const { loadState, setSavedState } = useAppStore.getState();
  const { applyUiPrefs } = useUiStore.getState();

  // Load saved state
  const raw = localStorage.getItem('tw_state');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      setSavedState(parsed as AppState);
      loadState({ ...JSON.parse(JSON.stringify(makeBootstrapState())), ...parsed });
    } catch {
      // Corrupt storage — start fresh
    }
  }

  // Load ui prefs
  const rawPrefs = localStorage.getItem('uiPrefsMeta');
  if (rawPrefs) {
    try {
      const prefs = JSON.parse(rawPrefs) as Partial<UiPrefs>;
      const safePrefs: Partial<UiPrefs> = {};
      if (prefs.scale !== undefined && VALID_SCALES.includes(prefs.scale as typeof VALID_SCALES[number])) {
        safePrefs.scale = prefs.scale;
      }
      if (prefs.theme !== undefined && VALID_THEMES.includes(prefs.theme)) {
        safePrefs.theme = prefs.theme;
      }
      if (prefs.language !== undefined && VALID_LANGUAGES.includes(prefs.language)) {
        safePrefs.language = prefs.language;
      }
      applyUiPrefs(safePrefs);
    } catch {
      // ignore
    }
  }
}

// ── Incoming message dispatcher ───────────────────────────────────────────────

function handleMessage(
  msg: PluginToUiMessage,
  callbacks: BridgeCallbacks,
): void {
  const { loadState, setSavedState, markClean } = useAppStore.getState();
  const { applyUiPrefs, openOverlay } = useUiStore.getState();

  switch (msg.type) {

    case 'load-config': {
      const isFirstLaunch = !msg.state || Object.keys(msg.state).length === 0;
      if (isFirstLaunch) {
        openOverlay('quick-start');
      } else {
        const merged = { ...JSON.parse(JSON.stringify(makeBootstrapState())), ...(msg.state as Partial<AppState>) } as AppState;
        ensureIds(merged);
        ensureVariations(merged);
        setSavedState(merged);
        loadState(merged);
      }
      break;
    }

    case 'load-ui-prefs-meta': {
      const p = msg.prefs;
      const safePrefs: Partial<UiPrefs> = {};
      if (p.scale !== undefined && VALID_SCALES.includes(p.scale as typeof VALID_SCALES[number])) {
        safePrefs.scale = p.scale;
      }
      if (p.theme !== undefined && VALID_THEMES.includes(p.theme)) {
        safePrefs.theme = p.theme;
      }
      if (p.language !== undefined && VALID_LANGUAGES.includes(p.language)) {
        safePrefs.language = p.language;
      }
      applyUiPrefs(safePrefs);
      break;
    }

    case 'collection-check-result': {
      callbacks.onCollectionCheckResult?.(msg);
      break;
    }

    case 'finish': {
      const { appState } = useAppStore.getState();
      setSavedState(appState);
      markClean();
      callbacks.onFinish?.(msg.tally, msg.errors);
      break;
    }

    case 'capabilities': {
      if (!msg.capabilities.multiMode) {
        banner.show({
          id: 'multi-mode-disabled',
          type: 'warning',
          title: 'Multi-mode not available',
          message: 'Your Figma plan does not support multi-mode variables. Themes will be created as separate collections.',
        });
        callbacks.onMultiModeDisabled?.();
      }
      break;
    }

    case 'processed-data-response': {
      callbacks.onProcessedData?.(msg.exportType, msg.content);
      break;
    }

    case 'export-bundle-response': {
      callbacks.onExportBundle?.(msg.files);
      break;
    }

    case 'error': {
      callbacks.onError?.(msg.message);
      break;
    }

    case 'warning': {
      callbacks.onWarning?.(msg.message);
      break;
    }
  }
}

// ── Callbacks interface ───────────────────────────────────────────────────────
// Screens register handlers via useFigmaBridge — this avoids tight coupling
// between the bridge and specific UI components.

export interface BridgeCallbacks {
  onCollectionCheckResult?: (msg: CollectionCheckResultMessage) => void;
  onFinish?: (tally: SyncTally, errors: string[] | null) => void;
  onMultiModeDisabled?: () => void;
  onProcessedData?: (format: string, content: string) => void;
  onExportBundle?: (files: Array<{ name: string; content: string }>) => void;
  onError?: (message: string) => void;
  onWarning?: (message: string) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFigmaBridge(callbacks: BridgeCallbacks = {}): void {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (isStandalone) {
      bootStandalone();
    }

    const handler = (event: MessageEvent) => {
      const msg = (event.data as { pluginMessage?: PluginToUiMessage })?.pluginMessage;
      if (!msg) return;
      handleMessage(msg, cbRef.current);
    };

    window.addEventListener('message', handler);

    // Auto-save appState to Figma plugin storage whenever it changes.
    // Debounced so rapid edits (typing a color name letter-by-letter) don't
    // flood the Figma sandbox with serialization work.
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.appState === prev.appState) return;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        parent.postMessage({ pluginMessage: { type: 'save-config', state: state.appState } }, '*');
      }, 2000);
    });

    return () => {
      window.removeEventListener('message', handler);
      unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
