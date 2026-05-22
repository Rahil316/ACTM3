/**
 * FIGMA COLOR SYSTEM GENERATOR
 * Organization:
 * 1. UI Initialization
 * 2. Message Router
 * 3. Config Translator  (appState → reference engine format)
 * 4. Export Formatters  (CSV / CSS / JSON / SCSS)
 * 5. Figma Variable API (CRUD – scale + token collections)
 * 6. Color Scale Maker  (Linear / Uniform / Natural / Expressive / Symmetric)
 * 7. Color System Generator (variableMaker – scales + semantic tokens)
 * 8. Color Math Utilities  (WCAG-correct conversions from Utils.js)
 */

// 1. UI INITIALIZATION — load saved size before showing UI to avoid resize flicker.
const UI = { WIDTH: 620, HEIGHT: 720, MIN_WIDTH: 440, MIN_HEIGHT: 480 };

(async () => {

  let savedUiSize = { width: UI.WIDTH, height: UI.HEIGHT };
  try {
    const saved = await figma.clientStorage.getAsync("uiPrefs");
    if (saved && saved.width && saved.height) savedUiSize = saved;
  } catch (e) {
    console.warn("Failed to load uiPrefs:", e);
  }
  figma.showUI(__html__, { width: savedUiSize.width, height: savedUiSize.height, themeColors: true });

  // Capability probe: try adding a second mode to a temp collection.
  // This is the only reliable way to detect free-plan restrictions without
  // exposing plan details (Figma has no plan-info API for plugins).
  const capabilities = { multiMode: true };
  let probeCol = null;
  try {
    probeCol = figma.variables.createVariableCollection("__tw_probe__");
    probeCol.addMode("probe2");
  } catch (e) {
    console.warn("Probe failed:", e);
    capabilities.multiMode = false;
  } finally {
    if (probeCol)
      try {
        probeCol.remove();
      } catch (e) {
        console.warn("Failed to remove probe collection:", e);
      }
  }
  figma.ui.postMessage({ type: "capabilities", capabilities });

  // Send saved UI meta-prefs (scale, theme) to UI thread
  try {
    const meta = await figma.clientStorage.getAsync("uiPrefsMeta");
    if (meta) figma.ui.postMessage({ type: "load-ui-prefs-meta", prefs: meta });
  } catch (e) {
    console.warn("Failed to load uiPrefsMeta:", e);
  }

  // Load saved config
  try {
    const savedConfigStr = figma.root.getPluginData("tw_state");
    if (savedConfigStr) {
      figma.ui.postMessage({ type: "load-config", state: JSON.parse(savedConfigStr) });
    }
  } catch (e) {
    console.warn("Failed to load saved config:", e);
  }
})();

// 2. MESSAGE ROUTER
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case "run-creator": {
        const config = translateConfig(msg.state);
        const result = variableMaker(config);
        await VariableManager.sync(result, config, msg.scope || "all", msg.state, msg.savedState || null);
        break;
      }

      case "check-collections": {
        const cols = await figma.variables.getLocalVariableCollectionsAsync();
        const names = [msg.colorName, msg.tokenColName].filter(Boolean);
        const existing = names.filter((n) => cols.some((c) => c.name === n));
        const renames = msg.savedState && msg.state ? buildVariableRenameMap(msg.savedState, msg.state) : { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } };
        figma.ui.postMessage({ type: "collection-check-result", existing, renames });
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
        const result = variableMaker(config);
        let content = "";
        if (msg.exportType === "json") content = JSON.stringify({ config, scales: result.scales, tokens: result.tokens, errors: result.errors }, null, 2);
        else if (msg.exportType === "csv") content = ExportFormatter.toCSV(result, config);
        else if (msg.exportType === "css") content = ExportFormatter.toCSS(result, config);
        else if (msg.exportType === "scss") content = generateScss(result, config);
        figma.ui.postMessage({ type: "processed-data-response", content, exportType: msg.exportType });
        break;
      }

      case "save-config":
        savePluginConfig(msg.state);
        break;

      case "cancel":
        figma.closePlugin();
        break;
    }
  } catch (err) {
    console.error("Plugin Error:", err);
    figma.ui.postMessage({ type: "error", message: (err && err.message) || String(err) || "Unknown error" });
  }
};
