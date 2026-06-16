import { useEffect, useRef } from "react";
import { banner } from "../store/bannerStore";
import { useUiStore } from "../store/uiStore";
import { VALID_SCALES, VALID_THEMES, VALID_LANGUAGES } from "../store/uiStore";
import type { PluginToUiMessage, CollectionCheckResultMessage, SyncTally } from "../types/messages";
import type { ProjectStore, Role, UiPrefs } from "../types/state";
import { useProjectStore, makeBootstrapState, ensureIds, ensureVariations } from "../store/projectStore";

// ── Standalone browser mock ──────────────────────────────────────────────────
// When running in a plain browser (window.parent === window) the Figma plugin
// thread is not present. We mock responses so dev/testing works without Figma.

const isStandalone = window.parent === window;

// Saved before the patch below so stubs can post responses without re-entering the patch.
const _nativePost = window.postMessage.bind(window);

function standaloneHandleOutgoing(msg: { pluginMessage: { type: string; [key: string]: unknown } }): void {
  const pm = msg.pluginMessage;

  if (pm.type === "check-collections") {
    setTimeout(() => {
      _nativePost(
        {
          pluginMessage: {
            type: "collection-check-result",
            existing: [],
            renames: { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } },
            conflicts: [
              {
                tokenRef: "token:primary/text/default",
                figmaName: "Primary/Text/Default-custom-name",
                suggestedName: "Primary/Text/Default",
                type: "token",
              },
            ],
          },
        },
        "*",
      );
    }, 50);
    return;
  }

  if (pm.type === "run-creator") {
    localStorage.setItem("tw_state", JSON.stringify(pm.state));
    setTimeout(() => {
      _nativePost(
        {
          pluginMessage: {
            type: "finish",
            tally: { created: 12, updated: 4, renamed: 0, failed: 0 },
            errors: null,
            result: null,
          },
        },
        "*",
      );
    }, 1000);
    return;
  }

  if (pm.type === "run-preview") {
    setTimeout(() => {
      _nativePost({ pluginMessage: { type: "preview-done" } }, "*");
    }, 800);
    return;
  }

  if (pm.type === "save-config") {
    localStorage.setItem("tw_state", JSON.stringify(pm.state));
    return;
  }

  if (pm.type === "save-ui-prefs-meta") {
    localStorage.setItem("uiPrefsMeta", JSON.stringify(pm.prefs));
    return;
  }

  if (pm.type === "resize") {
    localStorage.setItem("uiSize", JSON.stringify({ width: pm.width, height: pm.height }));
    return;
  }

  if (pm.type === "request-processed-data" || pm.type === "request-export-bundle") {
    const formats: string[] = pm.type === "request-processed-data" ? [pm.exportType as string] : (pm.formats as string[]) ?? [];
    Promise.all([
      import("../../shared/clrEngine"),
      import("../../shared/clrUtils"),
      import("../../shared/exportEng/bundler"),
      import("../../figma/docGen"),
    ]).then(([{ variableMaker }, { resolveTokenRefBgs, translateLocalBg }, { buildExportBundle }, { ExportFormatter }]) => {
      const projectStore = pm.state as ProjectStore;
      const config = {
        ...projectStore,
        roles: (projectStore.roles ?? []).map((r: Role) => ({
          ...r,
          ...translateLocalBg(r.localBg, projectStore.colors ?? [], projectStore.themes ?? []),
        })),
      } as Parameters<typeof variableMaker>[0];
      const pass1 = variableMaker(config);
      const result = resolveTokenRefBgs(config, pass1) ? variableMaker(config) : pass1;
      const rolesRecord: Record<string, Role> = {};
      (projectStore.roles ?? []).forEach((r, i) => { rolesRecord[String(i)] = r; });
      const exportConfig = { ...projectStore, roles: rolesRecord } as Parameters<typeof buildExportBundle>[1];
      const files = buildExportBundle(result, exportConfig, formats, projectStore as unknown as Record<string, unknown>, pm.timestamp as number | undefined);
      for (const f of files) {
        if (f.content === "" && f.path.endsWith(".csv")) {
          f.content = ExportFormatter.toCSV(result, exportConfig);
        } else if (f.content === "" && f.path.endsWith(".json") && !f.path.includes("/")) {
          f.content = JSON.stringify({ scales: result.scales, tokens: result.tokens, errors: result.errors }, null, 2);
        }
      }
      _nativePost({ pluginMessage: { type: "export-bundle-response", files } }, "*");
    }).catch((err) => {
      console.error("[export] failed:", err);
      _nativePost({ pluginMessage: { type: "error", message: String(err) } }, "*");
    });
    return;
  }
}

// Patch postMessage in standalone mode so outgoing messages are intercepted
if (isStandalone) {
  window.parent.postMessage = (data: unknown, ...args: unknown[]) => {
    if (data && typeof data === "object" && "pluginMessage" in (data as object)) {
      standaloneHandleOutgoing(data as { pluginMessage: { type: string; [key: string]: unknown } });
      return;
    }
    (_nativePost as (...a: unknown[]) => void)(data, ...args);
  };
}

// ── Boot: load state from localStorage in standalone mode ────────────────────

function bootStandalone(): void {
  const { loadState, setSavedState } = useProjectStore.getState();
  const { applyUiPrefs } = useUiStore.getState();

  // Load saved state
  const raw = localStorage.getItem("tw_state");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<ProjectStore>;
      setSavedState(parsed as ProjectStore);
      loadState({ ...JSON.parse(JSON.stringify(makeBootstrapState())), ...parsed });
    } catch {
      // Corrupt storage — start fresh
    }
  }

  // Load ui prefs
  const rawPrefs = localStorage.getItem("uiPrefsMeta");
  if (rawPrefs) {
    try {
      const prefs = JSON.parse(rawPrefs) as Partial<UiPrefs>;
      const safePrefs: Partial<UiPrefs> = {};
      if (prefs.scale !== undefined && VALID_SCALES.includes(prefs.scale as (typeof VALID_SCALES)[number])) {
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

function handleMessage(msg: PluginToUiMessage, callbacks: BridgeCallbacks): void {
  const { loadState, setSavedState, markClean } = useProjectStore.getState();
  const { applyUiPrefs, openOverlay } = useUiStore.getState();

  switch (msg.type) {
    case "load-config": {
      const isFirstLaunch = !msg.state || !Array.isArray(msg.state.colors);
      if (isFirstLaunch) {
        openOverlay("quick-start");
      } else {
        const merged = { ...JSON.parse(JSON.stringify(makeBootstrapState())), ...(msg.state as Partial<ProjectStore>) } as ProjectStore;
        ensureIds(merged);
        ensureVariations(merged);
        // savedState = last synced baseline (for rename detection).
        // Falls back to the UI state itself when no separate sync record exists
        // (first run after this change, or fresh install).
        if (msg.syncedState && Object.keys(msg.syncedState).length > 0) {
          const syncedMerged = { ...JSON.parse(JSON.stringify(makeBootstrapState())), ...(msg.syncedState as Partial<ProjectStore>) } as ProjectStore;
          ensureIds(syncedMerged);
          ensureVariations(syncedMerged);
          setSavedState(syncedMerged);
        } else {
          setSavedState(merged);
        }
        loadState(merged);
      }
      break;
    }

    case "load-ui-prefs-meta": {
      const p = msg.prefs;
      const safePrefs: Partial<UiPrefs> = {};
      if (p.scale !== undefined && VALID_SCALES.includes(p.scale as (typeof VALID_SCALES)[number])) {
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

    case "collection-check-result": {
      callbacks.onCollectionCheckResult?.(msg);
      break;
    }

    case "selection-change": {
      useUiStore.getState().setIsPreviewSelected(msg.isPreviewSelected);
      break;
    }

    case "finish": {
      const { projectStore } = useProjectStore.getState();
      setSavedState(projectStore);
      markClean();
      callbacks.onFinish?.(msg.tally, msg.errors);
      break;
    }

    case "capabilities": {
      useUiStore.getState().setMultiMode(msg.capabilities.multiMode);
      if (!msg.capabilities.multiMode) {
        banner.show({
          id: "multi-mode-disabled",
          type: "warning",
          title: "Multi-mode not available",
          message: "Your Figma plan does not support multi-mode variables. Themes will be created as separate collections.",
        });
        callbacks.onMultiModeDisabled?.();
      }
      break;
    }

    case "processed-data-response": {
      callbacks.onProcessedData?.(msg.exportType, msg.content);
      break;
    }

    case "export-bundle-response": {
      callbacks.onExportBundle?.(msg.files);
      break;
    }

    case "preview-done": {
      callbacks.onPreviewDone?.();
      break;
    }

    case "preview-interrupted": {
      callbacks.onPreviewInterrupted?.();
      break;
    }

    case "error": {
      callbacks.onError?.(msg.message);
      break;
    }

    case "warning": {
      if (callbacks.onWarning) {
        callbacks.onWarning(msg.message);
      } else {
        banner.show({ id: "plugin-warning", type: "warning", title: "Warning", message: msg.message });
      }
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
  onPreviewDone?: () => void;
  onPreviewInterrupted?: () => void;
  onMultiModeDisabled?: () => void;
  onProcessedData?: (format: string, content: string) => void;
  onExportBundle?: (files: Array<{ path: string; content: string }>) => void;
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

    window.addEventListener("message", handler);

    if (!isStandalone) {
      parent.postMessage({ pluginMessage: { type: "ui-ready" } }, "*");
    }

    return () => {
      window.removeEventListener("message", handler);
    };
  }, []);
}
