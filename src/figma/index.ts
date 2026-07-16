// Token Wand — Figma Plugin Entry Point
// Ported from vanilla_archive/src/figma/main.js
//
// This file is bundled by esbuild into dist/scripts.js.
// It runs in the Figma plugin sandbox (not the UI iframe).

import { translateConfig, resolveTokenRefBgs, buildVariableRenameMap, type PluginConfig } from "./config";
import { VariableManager, saveUiState } from "./figmaVars";
import { variableMaker, type EngineResult } from "../shared/engine/clrEngine.js";
import { ExportFormatter } from "./docGen";
import { buildExportBundle } from "../shared/exportEng/bundler";
import { runPrePublishAnalysis } from "./variableTracker";
import { generateCanvasPreview, wasPreviewInterrupted, markPreviewInterrupted } from "./canvasPreview";
import type { ExportConfig } from "../shared/exportEng/types";
import type { Role } from "../shared/types";

function toExportConfig(config: PluginConfig): ExportConfig {
  const rolesRecord: Record<string, Role> = {};
  if (config.roles) {
    config.roles.forEach((r, idx) => {
      rolesRecord[String(idx)] = r;
    });
  }
  return {
    ...config,
    roles: rolesRecord,
    variations: config.variations ?? undefined,
  };
}

function runEngine(config: PluginConfig): EngineResult {
  const result = variableMaker(config);
  if (resolveTokenRefBgs(config, result)) {
    return variableMaker(config);
  }
  return result;
}

// savedState (the last-synced baseline) only changes when a sync completes —
// not on every keystroke — but check-collections fires on every debounced edit
// to the LIVE config while the Run dialog is open. Recomputing the baseline's
// full engine run (variableMaker over every color x role x variation x theme)
// on each of those calls was pure waste. postMessage structurally clones its
// payload, so savedState is a fresh object on every call — reference equality
// can't detect "unchanged", so we fingerprint via JSON instead. Still far
// cheaper than re-running the engine, and only runs once per check-collections
// call rather than once per token.
let cachedBaselineFingerprint: string | null = null;
let cachedBaselineConfig: PluginConfig | null = null;
let cachedBaselineResult: EngineResult | null = null;

function getBaselineEngineResult(savedState: Parameters<typeof translateConfig>[0] | null): { config: PluginConfig | null; result: EngineResult | null } {
  if (!savedState) {
    cachedBaselineFingerprint = null;
    cachedBaselineConfig = null;
    cachedBaselineResult = null;
    return { config: null, result: null };
  }
  const fingerprint = JSON.stringify(savedState);
  if (fingerprint !== cachedBaselineFingerprint) {
    cachedBaselineFingerprint = fingerprint;
    cachedBaselineConfig = translateConfig(savedState);
    cachedBaselineResult = runEngine(cachedBaselineConfig);
  }
  return { config: cachedBaselineConfig, result: cachedBaselineResult };
}

// ── 1. UI INITIALIZATION ─────────────────────────────────────────────────────

const UI = { WIDTH: 560, HEIGHT: 720, MIN_WIDTH: 560, MIN_HEIGHT: 520 };
const capabilities = { multiMode: true };

(async () => {
  let savedUiSize = { width: UI.WIDTH, height: UI.HEIGHT };
  try {
    const saved = await figma.clientStorage.getAsync("uiPrefs");
    if (saved && saved.width && saved.height) savedUiSize = saved;
  } catch (e) {
    console.warn("Failed to load uiPrefs:", e);
  }
  figma.showUI(__html__, {
    width: savedUiSize.width,
    height: savedUiSize.height,
    themeColors: true,
  });

  // Capability probe: the only reliable way to detect free-plan restrictions.
  // Free plans cannot add a second mode to a collection.
  let probeCol: VariableCollection | null = null;
  try {
    probeCol = figma.variables.createVariableCollection(`__tw_probe_${Math.random().toString(36).slice(2, 8)}__`);
    probeCol.addMode("probe2");
  } catch (e) {
    console.warn("Probe failed:", e);
    capabilities.multiMode = false;
  } finally {
    if (probeCol) {
      try {
        probeCol.remove();
      } catch (e) {
        console.warn("Failed to remove probe collection:", e);
      }
    }
  }
})();

// ── 2. MESSAGE ROUTER ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
figma.ui.onmessage = async (msg: any) => {
  try {
    switch (msg.type) {
      case "ui-ready": {
        figma.ui.postMessage({ type: "capabilities", capabilities });

        try {
          const meta = await figma.clientStorage.getAsync("uiPrefsMeta");
          if (meta) figma.ui.postMessage({ type: "load-ui-prefs-meta", prefs: meta });
        } catch (e) {
          console.warn("Failed to load uiPrefsMeta:", e);
        }

        try {
          // tw_ui_state = last auto-saved UI state (what to restore into the editor)
          // tw_state    = last successfully synced state (rename/diff baseline)
          const uiRaw = figma.root.getPluginData("tw_ui_state") || figma.root.getPluginData("tw_state");
          const syncedRaw = figma.root.getPluginData("tw_state");
          const uiState = uiRaw ? JSON.parse(uiRaw) : null;
          const syncedState = syncedRaw ? JSON.parse(syncedRaw) : null;
          figma.ui.postMessage({ type: "load-config", state: uiState, syncedState });
        } catch (e) {
          console.warn("Failed to load saved config:", e);
          figma.ui.postMessage({ type: "load-config", state: null });
        }

        // Notify UI if a previous preview run was interrupted mid-write
        if (wasPreviewInterrupted()) {
          figma.ui.postMessage({ type: "preview-interrupted" });
        }
        break;
      }

      case "run-creator": {
        if (syncOrPreviewInFlight) {
          figma.ui.postMessage({ type: "error", message: "Another run is already in progress. Please wait for it to finish." });
          break;
        }
        syncOrPreviewInFlight = true;
        try {
          const config = translateConfig(msg.state);
          const result = runEngine(config);
          await VariableManager.sync(result, config, msg.scope || "all", msg.state, msg.savedState || null, msg.decisions || {}, msg.driftDecisions || {});
        } finally {
          syncOrPreviewInFlight = false;
        }
        break;
      }

      case "run-preview": {
        if (syncOrPreviewInFlight) {
          figma.ui.postMessage({ type: "error", message: "Another run is already in progress. Please wait for it to finish." });
          break;
        }
        syncOrPreviewInFlight = true;
        previewRunning = true;
        try {
          const config = translateConfig(msg.state);
          const result = runEngine(config);
          await generateCanvasPreview(msg.state, result);
        } finally {
          previewRunning = false;
          syncOrPreviewInFlight = false;
        }
        figma.ui.postMessage({ type: "preview-done" });
        break;
      }

      case "check-collections": {
        const config = translateConfig(msg.state);
        const result = runEngine(config);
        const renames = buildVariableRenameMap(msg.savedState ?? null, msg.state);
        const savedState = msg.savedState ?? null;
        // Value-drift detection re-runs the engine against the baseline and walks
        // the full tree twice — real cost, only worth paying when explicitly
        // requested (manual "Check for Figma Edits", or the mandatory pre-sync
        // check), not on every debounced re-check while the user is still editing.
        const { config: baselineConfig, result: baselineResult } = msg.checkValueDrift ? getBaselineEngineResult(savedState) : { config: null, result: null };
        const report = await runPrePublishAnalysis(msg.state, savedState, config, result, renames, baselineConfig, baselineResult);
        figma.ui.postMessage({ type: "collection-check-result", requestId: msg.requestId, valueDriftChecked: !!msg.checkValueDrift, ...report });
        break;
      }

      case "resize": {
        const w = Math.max(UI.MIN_WIDTH, msg.width);
        const h = Math.max(UI.MIN_HEIGHT, msg.height);
        figma.ui.resize(w, h);
        figma.clientStorage.setAsync("uiPrefs", { width: w, height: h }).catch(() => {});
        break;
      }

      case "save-ui-prefs-meta":
        figma.clientStorage.setAsync("uiPrefsMeta", msg.prefs).catch(() => {});
        break;

      case "request-processed-data": {
        const config = translateConfig(msg.state);
        const result = runEngine(config);
        const et: string = msg.exportType;

        // Build files[] via bundler, then fill in docGen formats
        const files = buildExportBundle(result, toExportConfig(config), [et], msg.state, msg.timestamp);

        // Fill content for docGen-owned formats (bundler leaves content empty)
        if (et === "csv") {
          files[0].content = ExportFormatter.toCSV(result, toExportConfig(config));
        } else if (et === "json") {
          files[0].content = JSON.stringify({ scales: result.scales, tokens: result.tokens, errors: result.errors }, null, 2);
        }

        figma.ui.postMessage({ type: "export-bundle-response", files });
        break;
      }

      case "request-export-bundle": {
        const bConfig = translateConfig(msg.state);
        const bResult = runEngine(bConfig);
        const bFiles = buildExportBundle(bResult, toExportConfig(bConfig), msg.formats || [], msg.state, msg.timestamp);
        for (const f of bFiles) {
          if (f.content === "" && f.path.endsWith(".csv")) {
            f.content = ExportFormatter.toCSV(bResult, toExportConfig(bConfig));
          } else if (f.content === "" && f.path.endsWith(".json") && !f.path.includes("/")) {
            f.content = JSON.stringify({ scales: bResult.scales, tokens: bResult.tokens, errors: bResult.errors }, null, 2);
          }
        }
        figma.ui.postMessage({ type: "export-bundle-response", files: bFiles });
        break;
      }

      case "save-config":
        saveUiState(msg.state);
        break;

      case "cancel":
        figma.closePlugin();
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err) || "Unknown error";
    console.error("Plugin Error:", err);
    figma.ui.postMessage({ type: "error", message });
  }
};

// Track whether a preview render is currently in flight so the close handler
// knows whether to persist the interrupted flag.
let previewRunning = false;

// Guards against overlapping "run-creator"/"run-preview" invocations, which
// would race on VariableManager's shared mutable cache/tally/mutations state.
let syncOrPreviewInFlight = false;

// If the plugin is closed mid-render, write the interrupted flag so the next
// open can warn the user and force a re-render of the affected sections.
figma.on("close", () => {
  if (previewRunning) markPreviewInterrupted();
});

// Selection change listener to detect preview node active selection
figma.on("selectionchange", () => {
  const selection = figma.currentPage.selection;
  const isPreviewSelected = selection.some((node) => {
    let curr: SceneNode | null = node;
    while (curr) {
      if (curr.getPluginData && (curr.getPluginData("previewRole") || curr.getPluginData("previewThemeId") || curr.getPluginData("previewColorId") || curr.getPluginData("previewScaleColorId") || curr.getPluginData("previewScaleStepId"))) {
        return true;
      }
      curr = curr.parent as SceneNode | null;
    }
    return false;
  });
  figma.ui.postMessage({ type: "selection-change", isPreviewSelected });
});
