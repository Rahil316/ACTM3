// Token Wand — Figma Plugin Entry Point
// Ported from vanilla_archive/src/figma/main.js
//
// This file is bundled by esbuild into dist/scripts.js.
// It runs in the Figma plugin sandbox (not the UI iframe).

import { translateConfig, buildVariableRenameMap, resolveTokenRefBgs, detectStructuralChanges } from './config';
import { VariableManager, saveUiState } from './figmaVars';
import { variableMaker } from '../shared/clrEngine.js';
import { ExportFormatter } from './docGen';
import { buildExportBundle } from './exportEng/bundler';
import { analyzeNameConflicts, computeSyncPreview } from './variableTracker';
import { generateCanvasPreview, markPreviewInterrupted, wasPreviewInterrupted, clearPreviewInterrupted } from './canvasPreview';

function runEngine(config: any) {
  const result = variableMaker(config);
  if (resolveTokenRefBgs(config, result)) {
    return variableMaker(config);
  }
  return result;
}

// ── 1. UI INITIALIZATION ─────────────────────────────────────────────────────

const UI = { WIDTH: 560, HEIGHT: 720, MIN_WIDTH: 560, MIN_HEIGHT: 520 };
const capabilities = { multiMode: true };

(async () => {
  let savedUiSize = { width: UI.WIDTH, height: UI.HEIGHT };
  try {
    const saved = await figma.clientStorage.getAsync('uiPrefs');
    if (saved && saved.width && saved.height) savedUiSize = saved;
  } catch (e) {
    console.warn('Failed to load uiPrefs:', e);
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
    probeCol.addMode('probe2');
  } catch (e) {
    console.warn('Probe failed:', e);
    capabilities.multiMode = false;
  } finally {
    if (probeCol) {
      try {
        probeCol.remove();
      } catch (e) {
        console.warn('Failed to remove probe collection:', e);
      }
    }
  }
})();

// ── 2. MESSAGE ROUTER ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
figma.ui.onmessage = async (msg: any) => {
  try {
    switch (msg.type) {
      case 'ui-ready': {
        figma.ui.postMessage({ type: 'capabilities', capabilities });

        try {
          const meta = await figma.clientStorage.getAsync('uiPrefsMeta');
          if (meta) figma.ui.postMessage({ type: 'load-ui-prefs-meta', prefs: meta });
        } catch (e) {
          console.warn('Failed to load uiPrefsMeta:', e);
        }

        try {
          // tw_ui_state = last auto-saved UI state (what to restore into the editor)
          // tw_state    = last successfully synced state (rename/diff baseline)
          const uiRaw = figma.root.getPluginData('tw_ui_state') || figma.root.getPluginData('tw_state');
          const syncedRaw = figma.root.getPluginData('tw_state');
          const uiState = uiRaw ? JSON.parse(uiRaw) : null;
          const syncedState = syncedRaw ? JSON.parse(syncedRaw) : null;
          figma.ui.postMessage({ type: 'load-config', state: uiState, syncedState });
        } catch (e) {
          console.warn('Failed to load saved config:', e);
          figma.ui.postMessage({ type: 'load-config', state: null });
        }

        // Notify UI if a previous preview run was interrupted mid-write
        if (wasPreviewInterrupted()) {
          figma.ui.postMessage({ type: 'preview-interrupted' });
        }
        break;
      }

      case 'run-creator': {
        const config = translateConfig(msg.state);
        const result = runEngine(config);
        await VariableManager.sync(
          result,
          config,
          msg.scope || 'all',
          msg.state,
          msg.savedState || null,
          msg.decisions || {},
        );
        break;
      }

      case 'run-preview': {
        const config = translateConfig(msg.state);
        const result = runEngine(config);
        previewRunning = true;
        try {
          await generateCanvasPreview(msg.state, result);
        } finally {
          previewRunning = false;
        }
        figma.ui.postMessage({ type: 'preview-done' });
        break;
      }

      case 'check-collections': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const scaleColName = msg.state?.scaleCollectionName || '_scale';
        const tokenColName = msg.state?.tokenCollectionName || 'color tokens';
        const sourceColName = msg.state?.sourceCollectionName || '_constants';

        const scaleCol = cols.find((c) => c.name === scaleColName) || null;
        const tokenCol = cols.find((c) => c.name === tokenColName) || null;
        const sourceCol = cols.find((c) => c.name === sourceColName) || null;

        const names = [scaleColName, tokenColName, sourceColName].filter(Boolean);
        const existing = cols
          .filter((c) => names.includes(c.name))
          .map((c) => ({ name: c.name, id: c.id }));
        const renames =
          msg.savedState && msg.state
            ? buildVariableRenameMap(msg.savedState, msg.state)
            : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };

        const config = translateConfig(msg.state);
        const result = runEngine(config);
        const localVars = await figma.variables.getLocalVariablesAsync();
        const conflicts = analyzeNameConflicts(
          result,
          config,
          localVars,
          tokenCol,
          scaleCol,
          sourceCol,
        );

        const syncPreview = computeSyncPreview(result, config, localVars, cols);
        // Add savedState-diff renames (buildVariableRenameMap) into the preview count
        const pendingRenames = renames.summary.scaleCount + renames.summary.tokenCount;
        if (pendingRenames > 0) {
          syncPreview.toRename += pendingRenames;
          syncPreview.total += pendingRenames;
        }
        const structuralChanges = msg.savedState ? detectStructuralChanges(msg.savedState, msg.state) : [];
        figma.ui.postMessage({ type: 'collection-check-result', existing, renames, conflicts, syncPreview, structuralChanges });
        break;
      }

      case 'resize': {
        const w = Math.max(UI.MIN_WIDTH, msg.width);
        const h = Math.max(UI.MIN_HEIGHT, msg.height);
        figma.ui.resize(w, h);
        figma.clientStorage.setAsync('uiPrefs', { width: w, height: h }).catch(() => {});
        break;
      }

      case 'save-ui-prefs-meta':
        figma.clientStorage.setAsync('uiPrefsMeta', msg.prefs).catch(() => {});
        break;

      case 'request-processed-data': {
        const config = translateConfig(msg.state);
        const result = runEngine(config) as any;
        const et: string = msg.exportType;

        // Build files[] via bundler, then fill in docGen formats
        const files = buildExportBundle(result, config, [et], msg.state);

        // Fill content for docGen-owned formats (bundler leaves content empty)
        if (et === 'csv') {
          files[0].content = ExportFormatter.toCSV(result, config);
        } else if (et === 'json') {
          files[0].content = JSON.stringify(
            { scales: result.scales, tokens: result.tokens, errors: result.errors },
            null, 2,
          );
        }

        figma.ui.postMessage({ type: 'export-bundle-response', files });
        break;
      }

      case 'request-export-bundle': {
        const bConfig = translateConfig(msg.state);
        const bResult = runEngine(bConfig);
        const bFiles = buildExportBundle(bResult, bConfig, msg.formats || [], msg.state);
        figma.ui.postMessage({ type: 'export-bundle-response', files: bFiles });
        break;
      }

      case 'save-config':
        saveUiState(msg.state);
        break;

      case 'cancel':
        figma.closePlugin();
        break;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err) || 'Unknown error';
    console.error('Plugin Error:', err);
    figma.ui.postMessage({ type: 'error', message });
  }
};

// Track whether a preview render is currently in flight so the close handler
// knows whether to persist the interrupted flag.
let previewRunning = false;

// If the plugin is closed mid-render, write the interrupted flag so the next
// open can warn the user and force a re-render of the affected sections.
figma.on('close', () => {
  if (previewRunning) markPreviewInterrupted();
});

// Selection change listener to detect preview node active selection
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  const isPreviewSelected = selection.some(node => {
    let curr: SceneNode | null = node;
    while (curr) {
      if (curr.getPluginData && (
        curr.getPluginData('previewRole') ||
        curr.getPluginData('previewThemeId') ||
        curr.getPluginData('previewColorId') ||
        curr.getPluginData('previewScaleColorId') ||
        curr.getPluginData('previewScaleStepId')
      )) {
        return true;
      }
      curr = curr.parent as SceneNode | null;
    }
    return false;
  });
  figma.ui.postMessage({ type: 'selection-change', isPreviewSelected });
});
