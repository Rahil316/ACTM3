// Token Wand — Figma Plugin Entry Point
// Ported from vanilla_archive/src/figma/main.js
//
// This file is bundled by esbuild into dist/scripts.js.
// It runs in the Figma plugin sandbox (not the UI iframe).

import { translateConfig, buildVariableRenameMap } from './config';
import { VariableManager, savePluginConfig } from './figmaVars';
import { variableMaker } from '../shared/clrEngine.js';
import { ExportFormatter } from './docGen';
import { buildExportBundle } from './exportEng/bundler';

// ── 1. UI INITIALIZATION ─────────────────────────────────────────────────────

const UI = { WIDTH: 560, HEIGHT: 720, MIN_WIDTH: 560, MIN_HEIGHT: 520 };

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
  const capabilities = { multiMode: true };
  let probeCol: VariableCollection | null = null;
  try {
    probeCol = figma.variables.createVariableCollection('__tw_probe__');
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
  figma.ui.postMessage({ type: 'capabilities', capabilities });

  try {
    const meta = await figma.clientStorage.getAsync('uiPrefsMeta');
    if (meta) figma.ui.postMessage({ type: 'load-ui-prefs-meta', prefs: meta });
  } catch (e) {
    console.warn('Failed to load uiPrefsMeta:', e);
  }

  try {
    const savedConfigStr = figma.root.getPluginData('tw_state');
    if (savedConfigStr) {
      figma.ui.postMessage({ type: 'load-config', state: JSON.parse(savedConfigStr) });
    } else {
      // First launch — send empty state so UI shows quick-start
      figma.ui.postMessage({ type: 'load-config', state: null });
    }
  } catch (e) {
    console.warn('Failed to load saved config:', e);
    figma.ui.postMessage({ type: 'load-config', state: null });
  }
})();

// ── 2. MESSAGE ROUTER ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
figma.ui.onmessage = async (msg: any) => {
  try {
    switch (msg.type) {
      case 'run-creator': {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        await VariableManager.sync(
          result,
          config,
          msg.scope || 'all',
          msg.state,
          msg.savedState || null,
        );
        break;
      }

      case 'check-collections': {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const scaleColName = msg.state?.scaleCollectionName || '_scale';
        const tokenColName = msg.state?.tokenCollectionName || 'color tokens';
        const names = [scaleColName, tokenColName].filter(Boolean);
        const existing = cols
          .filter((c) => names.includes(c.name))
          .map((c) => ({ name: c.name, id: c.id }));
        const renames =
          msg.savedState && msg.state
            ? buildVariableRenameMap(msg.savedState, msg.state)
            : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
        figma.ui.postMessage({ type: 'collection-check-result', existing, renames });
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
        const result = variableMaker(config) as any;
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
        const bResult = variableMaker(bConfig);
        const bFiles = buildExportBundle(bResult, bConfig, msg.formats || [], msg.state);
        figma.ui.postMessage({ type: 'export-bundle-response', files: bFiles });
        break;
      }

      case 'save-config':
        savePluginConfig(msg.state);
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
