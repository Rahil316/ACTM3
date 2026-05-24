// Token Wand — Figma Plugin Entry Point
// Ported from vanilla_archive/src/figma/main.js
//
// This file is bundled by esbuild into dist/scripts.js.
// It runs in the Figma plugin sandbox (not the UI iframe).

import { translateConfig, buildVariableRenameMap } from './config';
import { VariableManager, savePluginConfig } from './figmaVars';

// Import JS-based engine and formatters via side-effect globals.
// esbuild bundles these as IIFE scripts whose global assignments become
// available within the same bundle scope.
import '../shared/clrUtils.js';
import '../shared/clrEngine.js';
import './docGen.js';
import './exportEng/helpers.js';
import './exportEng/fmtCSS.js';
import './exportEng/fmtSCSS.js';
import './exportEng/fmtTailwind.js';
import './exportEng/fmtDTCG.js';
import './exportEng/fmtStyleDictionary.js';
import './exportEng/fmtSwift.js';
import './exportEng/fmtAndroid.js';
import './exportEng/fmtReactNative.js';
import './exportEng/bundler.js';

// These global functions/objects are declared in the imported JS files above.
// Declare them here so TypeScript knows they exist at runtime.
declare function variableMaker(config: unknown): unknown;
declare function buildExportBundle(
  result: unknown,
  config: unknown,
  formats: string[],
  appState: unknown,
): Array<{ path: string; content: string }>;
declare const ExportFormatter: {
  toCSV(result: unknown, config: unknown): string;
  toCSS(result: unknown, config: unknown): string;
};
declare function generateScss(result: unknown, config: unknown): string;
declare const fmtTailwind: { config(result: unknown, config: unknown): string };
declare const fmtDTCG: { scale(r: unknown, c: unknown): string };
declare const fmtStyleDictionary: { global(r: unknown, c: unknown): string };
declare const fmtSwift: { file(r: unknown, c: unknown, theme: string): string };
declare const fmtAndroid: { file(r: unknown, c: unknown, theme: string): string };
declare const fmtReactNative: { index(r: unknown, c: unknown): string };

// ── 1. UI INITIALIZATION ─────────────────────────────────────────────────────

const UI = { WIDTH: 620, HEIGHT: 720, MIN_WIDTH: 440, MIN_HEIGHT: 480 };

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
        let content = '';
        const et: string = msg.exportType;

        if (et === 'json') {
          content = JSON.stringify(
            { config, scales: result.scales, tokens: result.tokens, errors: result.errors },
            null,
            2,
          );
        } else if (et === 'csv') {
          content = ExportFormatter.toCSV(result, config);
        } else if (et === 'css') {
          content = ExportFormatter.toCSS(result, config);
        } else if (et === 'scss') {
          content = generateScss(result, config);
        } else if (et === 'tailwind') {
          content = fmtTailwind.config(result, config);
        } else if (et === 'dtcg') {
          content = fmtDTCG.scale(result, config);
        } else if (et === 'style-dictionary') {
          content = fmtStyleDictionary.global(result, config);
        } else if (et === 'ios-swift') {
          const themeKeys = Object.keys(result.tokens || {});
          content = themeKeys.map((t) => fmtSwift.file(result, config, t)).join('\n\n');
        } else if (et === 'android') {
          const themeKeys = Object.keys(result.tokens || {});
          content = themeKeys.map((t) => fmtAndroid.file(result, config, t)).join('\n\n');
        } else if (et === 'rn-ts') {
          content = fmtReactNative.index(result, config);
        } else if (et === 'wand') {
          content = JSON.stringify(msg.state || {}, null, 2);
        }

        figma.ui.postMessage({
          type: 'processed-data-response',
          content,
          exportType: msg.exportType,
        });
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
