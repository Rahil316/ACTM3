/**
 * ============================================================================
 * Token Wand UI RUNTIME
 *
 * Owns: runtime state, message handling, event wiring, UI prefs, boot.
 *
 * Screen renderers and services live in their own files:
 *   store.js               — appState, mutations, validation, dirty hash
 *   components/            — DOM utilities and component templates
 *   screens/               — one file per visible screen (colors, roles, project, settings, preview)
 *   services/              — CRUD, Figma sync/publish, notifications
 *   router.js              — all screen/overlay visibility
 * ============================================================================
 */

// ── 1. RUNTIME STATE REGISTRY ──────────────────────────────────────────────
//
//   appState           Full plugin config. All mutations go through store.js.
//   uiPrefs            { scale, theme }. Persisted in Figma clientStorage.
//   activeSidebarTab   Which sidebar tab is visible.
//   savedState         Deep-clone of appState at last successful Figma sync.

// Plugin mode / selection constants — consumed by screens/settings.js setters.
const UI_MODES = {
  plugin: ['scale', 'direct'],
  grouping: ['color', 'role'],
  mapping: ['contrast', 'index'],
};

// Sync dialog state — scoped to the run-confirm flow.
let pendingScope = 'all';

let lastCollectionCheckResult = [];
let lastRenameData = null;

// Resize drag state.
let isResizing = false;
let resizeOriginX = 0,
  resizeOriginY = 0;
let resizeStartW = 0,
  resizeStartH = 0;

// ── 2. MESSAGE HANDLING ────────────────────────────────────────────────────

window.onmessage = (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  // Standalone browser environment mocks (runs when window.parent === window)
  if (window.parent === window) {
    if (msg.type === 'check-collections') {
      setTimeout(() => {
        window.postMessage(
          {
            pluginMessage: {
              type: 'collection-check-result',
              existing: [],
              renames: { scale: {}, tokens: {}, summary: { scaleCount: 0, tokenCount: 0, changes: [] } },
            },
          },
          '*',
        );
      }, 50);
      return;
    }
    if (msg.type === 'run-creator') {
      localStorage.setItem('tw_state', JSON.stringify(msg.state));
      setTimeout(() => {
        window.postMessage(
          {
            pluginMessage: {
              type: 'finish',
              tally: { created: 12, updated: 4, renamed: 0, failed: 0 },
              errors: null,
              result: null,
            },
          },
          '*',
        );
      }, 1000);
      return;
    }
    if (msg.type === 'request-processed-data') {
      const config = translateConfig(msg.state);
      const result = variableMaker(config);
      let content = '';
      const et = msg.exportType;
      if (et === 'json')
        content = JSON.stringify(
          { config, scales: result.scales, tokens: result.tokens, errors: result.errors },
          null,
          2,
        );
      else if (et === 'csv') content = ExportFormatter.toCSV(result, config);
      else if (et === 'css') content = ExportFormatter.toCSS(result, config);
      else if (et === 'scss') content = generateScss(result, config);
      else if (et === 'tailwind') content = fmtTailwind.config(result, config);
      else if (et === 'dtcg') content = fmtDTCG.scale(result, config);
      else if (et === 'style-dictionary') content = fmtStyleDictionary.global(result, config);
      else if (et === 'ios-swift')
        content = Object.keys(result.tokens || {})
          .map((t) => fmtSwift.file(result, config, t))
          .join('\n\n');
      else if (et === 'android')
        content = Object.keys(result.tokens || {})
          .map((t) => fmtAndroid.file(result, config, t))
          .join('\n\n');
      else if (et === 'rn-ts') content = fmtReactNative.index(result, config);
      setTimeout(() => {
        window.postMessage(
          { pluginMessage: { type: 'processed-data-response', content, exportType: msg.exportType } },
          '*',
        );
      }, 50);
      return;
    }
    if (msg.type === 'request-export-bundle') {
      const bConfig = translateConfig(msg.state);
      const bResult = variableMaker(bConfig);
      const bFiles = buildExportBundle(bResult, bConfig, msg.formats || [], msg.state);
      setTimeout(() => {
        window.postMessage({ pluginMessage: { type: 'export-bundle-response', files: bFiles } }, '*');
      }, 50);
      return;
    }
    if (msg.type === 'save-ui-prefs-meta' || msg.type === 'resize' || msg.type === 'save-config') {
      if (msg.type === 'save-ui-prefs-meta') {
        localStorage.setItem('uiPrefsMeta', JSON.stringify(msg.prefs));
      } else if (msg.type === 'resize') {
        localStorage.setItem('uiPrefs', JSON.stringify({ width: msg.width, height: msg.height }));
      } else if (msg.type === 'save-config') {
        localStorage.setItem('tw_state', JSON.stringify(msg.state));
      }
      return;
    }
  }

  if (msg.type === 'capabilities') {
    if (!msg.capabilities.multiMode) {
      const multiModeEls = document.querySelectorAll('[data-requires-multimode]');
      multiModeEls.forEach((el) => el.classList.add('hidden'));
      BannerManager.show({
        id: 'cap-multimode',
        type: 'warning',
        title: 'Figma Starter Plan Limit',
        message:
          'Figma Starter plans are limited to 1 variable mode per collection. Upgrade your plan to create and publish multiple modes.',
        dismissable: true,
      });
    }
    return;
  }

  if (msg.type === 'load-config') {
    const isFirstLaunch = !msg.state || Object.keys(msg.state).length === 0;

    if (isFirstLaunch) {
      renderColorGroups();
      renderRoles();
      syncInputsFromState();
      renderQuickStart();
      showOverlay('quickstart-overlay');
    } else {
      const incoming = msg.state;
      setSavedState(incoming);
      loadState(Object.assign({}, JSON.parse(JSON.stringify(_bootstrapConfig)), incoming));
      renderColorGroups();
      renderRoles();
      syncInputsFromState();
    }
    return;
  }

  if (msg.type === 'load-ui-prefs-meta') {
    const VALID_SCALES = [0.7, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5];
    const VALID_THEMES = ['figma', 'dark', 'light'];
    const VALID_LANGS = ['en', 'es', 'hi'];
    if (msg.prefs.scale !== undefined) {
      const s = parseFloat(msg.prefs.scale);
      if (VALID_SCALES.includes(s)) uiPrefs.scale = s;
    }
    if (msg.prefs.theme !== undefined && VALID_THEMES.includes(msg.prefs.theme)) {
      uiPrefs.theme = msg.prefs.theme;
    }
    if (msg.prefs.language !== undefined && VALID_LANGS.includes(msg.prefs.language)) {
      uiPrefs.language = msg.prefs.language;
    }
    applyUiPrefs();
    syncUiSettingsInputs();
    return;
  }

  if (msg.type === 'collection-check-result') {
    lastCollectionCheckResult = msg.existing || [];
    lastRenameData = msg.renames || null;
    renderRunDialog();
    setRunScope(pendingScope || 'all');
    showOverlay('run-dialog-overlay');
    return;
  }

  if (msg.type === 'finish') {
    setSavedState(appState);
    markClean();
    pendingScope = 'all'; // reset so Alt+Enter always triggers a full sync next time
    hideOverlay('loading-overlay');
    renderSuccessDialog(msg.tally);
    showOverlay('success-overlay');
    showSystemBanners(msg.errors || null, msg.result || null);
    return;
  }

  if (msg.type === 'processed-data-response') {
    const { content, exportType } = msg;
    const mimeMap = {
      json: 'application/json',
      css: 'text/css',
      csv: 'text/csv',
      scss: 'text/plain',
      tailwind: 'text/javascript',
      dtcg: 'application/json',
      'style-dictionary': 'application/json',
      'ios-swift': 'text/plain',
      android: 'application/xml',
      'rn-ts': 'text/plain',
    };
    const extMap = {
      json: 'json',
      css: 'css',
      csv: 'csv',
      scss: 'scss',
      tailwind: 'js',
      dtcg: 'json',
      'style-dictionary': 'json',
      'ios-swift': 'swift',
      android: 'xml',
      'rn-ts': 'ts',
    };
    const typeLabel = {
      json: 'tokens',
      css: 'variables',
      csv: 'token_list',
      scss: 'tokens',
      tailwind: 'tailwind.config',
      dtcg: 'dtcg-tokens',
      'style-dictionary': 'sd-tokens',
      'ios-swift': 'Colors',
      android: 'colors',
      'rn-ts': 'tokens',
    };
    triggerDownload(
      content,
      exportFileName(typeLabel[exportType] || exportType, extMap[exportType] || exportType),
      mimeMap[exportType] || 'text/plain',
    );
    return;
  }

  if (msg.type === 'export-bundle-response') {
    buildAndDownloadZip(appState.name, msg.files || []);
    return;
  }

  if (msg.type === 'error') {
    hideOverlay('loading-overlay');
    renderErrorDialog(msg.message);
    showOverlay('error-overlay');
    return;
  }

  if (msg.type === 'warning') {
    BannerManager.warn(msg.message, { dismissable: true, autoClose: 8000 });
  }
};

// ── 3. UI PREFERENCES & RESIZE ─────────────────────────────────────────────

function _detectFigmaTheme() {
  const html = document.documentElement;
  const body = document.body;
  if (html.classList.contains('figma-dark') || body.classList.contains('figma-dark')) return 'dark';
  if (html.classList.contains('figma-light') || body.classList.contains('figma-light')) return 'light';
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyUiPrefs() {
  document.documentElement.style.setProperty('--ui-scale', uiPrefs.scale);
  document.body.style.zoom = uiPrefs.scale;
  const theme = uiPrefs.theme === 'figma' ? _detectFigmaTheme() : uiPrefs.theme;
  document.body.setAttribute('data-ui-theme', theme);
  if (typeof translateStaticDOM === 'function') translateStaticDOM();
}

function updateUiPref(key, value) {
  uiPrefs[key] = value;
  applyUiPrefs();
  parent.postMessage({ pluginMessage: { type: 'save-ui-prefs-meta', prefs: uiPrefs } }, '*');
}

function onMouseMove(e) {
  if (!isResizing) return;
  const w = Math.min(UI_DIMS.maxWidth, Math.max(UI_DIMS.minWidth, resizeStartW + (e.clientX - resizeOriginX)));
  const h = Math.min(UI_DIMS.maxHeight, Math.max(UI_DIMS.minHeight, resizeStartH + (e.clientY - resizeOriginY)));
  parent.postMessage({ pluginMessage: { type: 'resize', width: w, height: h } }, '*');
}

function onMouseUp() {
  isResizing = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// ── 4. TOOLTIP LOGIC ───────────────────────────────────────────────────────

const tooltipEl = document.getElementById('tooltip');

document.addEventListener(
  'mouseenter',
  (e) => {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest('[data-tooltip]');
    if (!target) return;
    const text = target.getAttribute('data-tooltip');
    tooltipEl.textContent = text;
    tooltipEl.classList.add('active');
    const rect = target.getBoundingClientRect();
    const tipRect = tooltipEl.getBoundingClientRect();
    let top = rect.top - tipRect.height - 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (top < 8) top = rect.bottom + 8;
    left = Math.max(8, Math.min(window.innerWidth - tipRect.width - 8, left));
    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;
  },
  true,
);

document.addEventListener(
  'mouseleave',
  (e) => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('[data-tooltip]')) tooltipEl.classList.remove('active');
  },
  true,
);

// ── 5. EVENT WIRING ────────────────────────────────────────────────────────

// Navigation & sheets
function syncVersionButton() {
  const btn = document.getElementById('btn-version');
  if (!btn) return;
  const blockedReason = versionSaveBlockedReason();
  btn.setAttribute('data-tooltip', blockedReason || 'Save version');
  if (blockedReason) {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.cursor = 'not-allowed';
    btn.onclick = null;
  } else {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
    btn.onclick = _openSaveVersionSheet;
  }
}
document.getElementById('btn-settings').onclick = openSettings;
document.getElementById('settings-cancel').onclick = () => closeSettings(true);
document.getElementById('settings-done').onclick = () => closeSettings(false);
document
  .querySelectorAll('.settings-tab')
  .forEach((btn) => btn.addEventListener('click', () => switchSettingsTab(btn.dataset.tab)));
document.getElementById('btn-more').onclick = () => {
  renderExportSheet();
  showSheet('more-sheet');
};
document.getElementById('overlay').onclick = hideSheets;
document.getElementById('close-more').onclick = hideSheets;

// Primary actions
document.getElementById('btn-run').onclick = () => handleSubmit('all');
// btn-run-confirm is rendered dynamically by renderRunDialog() — wire via delegation
document.getElementById('run-dialog-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'btn-run-confirm') {
    hideOverlay('run-dialog-overlay');
    proceedWithSync();
  }
});
document.getElementById('btn-import').onclick = () => document.getElementById('file-input').click();
document.getElementById('preview-back').onclick = () => {
  document.getElementById('preview-screen').classList.add('hidden');
  document.getElementById('preview-screen').style.display = '';
  document.getElementById('main-nav-area').classList.remove('hidden');
  document
    .querySelectorAll('.sidebar-tab-btn')
    .forEach((b) => b.classList.toggle('active', b.dataset.tab === activeSidebarTab));
  const activeTab = document.querySelector('.sidebar-tab-btn.active');
  if (activeTab) activeTab.focus();
  BannerManager.clear();
};

// Sidebar tabs
document.querySelectorAll('.sidebar-tab-btn').forEach((btn) => {
  if (!btn.dataset.tab) return;
  btn.onclick = () => {
    if (btn.dataset.tab === 'preview') {
      document.querySelectorAll('.sidebar-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderPreviewTabs();
      try {
        renderPreviewPanel(variableMaker(translateConfig(appState)));
      } catch (err) {
        console.error('Preview render failed:', err);
      }
      const firstTab = document.querySelector('#preview-screen .preview-tab-btn:not(.hidden)');
      document.querySelectorAll('#preview-screen .preview-tab-btn').forEach((b) => b.classList.remove('active'));
      document
        .querySelectorAll('#preview-content .preview-panel, #preview-theme-panels > div')
        .forEach((p) => p.classList.remove('active'));
      if (firstTab) {
        firstTab.classList.add('active');
        const firstPanel = document.getElementById(firstTab.dataset.target);
        if (firstPanel) firstPanel.classList.add('active');
        const toolbar = document.getElementById('preview-theme-toolbar');
        if (toolbar) toolbar.style.display = firstTab.dataset.target === 'preview-colors' ? 'none' : 'flex';
      }
      document.getElementById('main-nav-area').classList.add('hidden');
      const ps = document.getElementById('preview-screen');
      ps.classList.remove('hidden');
      ps.style.display = 'flex';
      syncPreviewBackground();
      return;
    }
    switchSidebarTab(btn.dataset.tab);
  };
});

// Export (More sheet) — ZIP button
document.getElementById('btn-export-zip').onclick = () => {
  const formats = Array.from(selectedFormats);
  if (formats.length === 0) {
    BannerManager.show({ type: 'warning', message: 'Select at least one format.', autoClose: 2500 });
    return;
  }
  BannerManager.show({ type: 'info', message: 'Building export package…', autoClose: 3000 });
  parent.postMessage({ pluginMessage: { type: 'request-export-bundle', state: appState, formats } }, '*');
};

// Export (main tab shortcuts — legacy)
if (document.getElementById('btn-export-css')) document.getElementById('btn-export-css').onclick = exportToCSS;
if (document.getElementById('btn-export-csv')) document.getElementById('btn-export-csv').onclick = exportToCSV;
if (document.getElementById('btn-export-scss')) document.getElementById('btn-export-scss').onclick = exportToSCSS;
if (document.getElementById('btn-export-json')) document.getElementById('btn-export-json').onclick = exportConfig;

// Reset to defaults → show Quick Start
document.getElementById('opt-clear').onclick = () => {
  createDialogue('confirm-clear-overlay', {
    title: 'Reset to defaults',
    body: 'This will clear all colors, roles, themes and settings. This cannot be undone.',
    buttons: [
      { label: t('cancel') },
      {
        label: 'Clear All',
        variant: 'danger-solid',
        action: () => {
          loadState(JSON.parse(JSON.stringify(_bootstrapConfig)));
          setSavedState(null);
          renderColorGroups();
          renderRoles();
          syncInputsFromState();
          schedulePreview();
          hideSheets();
          renderQuickStart();
          showOverlay('quickstart-overlay');
        },
      },
    ],
  });
};

// Preview panel tab switching
document.getElementById('preview-screen').addEventListener('click', (e) => {
  const btn = e.target.closest('.preview-tab-btn');
  if (!btn) return;
  const target = btn.dataset.target;
  if (!target) return;
  document.querySelectorAll('#preview-screen .preview-tab-btn').forEach((b) => b.classList.remove('active'));
  document
    .querySelectorAll('#preview-content .preview-panel, #preview-theme-panels > div')
    .forEach((p) => p.classList.remove('active'));
  btn.classList.add('active');
  const panelEl = document.getElementById(target);
  if (panelEl) panelEl.classList.add('active');
  const toolbar = document.getElementById('preview-theme-toolbar');
  if (toolbar) toolbar.style.display = target === 'preview-colors' ? 'none' : 'flex';
  syncPreviewBackground();
});

// Resize handle
document.getElementById('resize-handle').onmousedown = (e) => {
  isResizing = true;
  resizeOriginX = e.clientX;
  resizeOriginY = e.clientY;
  resizeStartW = window.innerWidth;
  resizeStartH = window.innerHeight;
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};

// File input import
document.getElementById('file-input').onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
  e.target.value = '';
};

// Drag-and-drop config import
const _dropOverlay = document.getElementById('drop-overlay');
window.addEventListener('dragenter', (e) => {
  if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
    e.preventDefault();
    _dropOverlay.classList.add('active');
  }
});
_dropOverlay.ondragover = (e) => e.preventDefault();
_dropOverlay.ondragleave = () => _dropOverlay.classList.remove('active');
_dropOverlay.ondrop = (e) => {
  e.preventDefault();
  _dropOverlay.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
};

// ── 5b. KEYBOARD NAVIGATION ────────────────────────────────────────────────
//
// Alt+Enter → Run (main editor) / Publish to Figma (run dialog)
// Alt+0 → Project tab
// Alt+1 → Palette tab          Alt+3 → Preview: Palette
// Alt+2 → Color Roles tab      Alt+4..N+3 → Preview: Theme 1..N
// Escape → close preview

(function () {
  function getPreviewPanelForCode(code) {
    if (code === 'Digit3') return isDirectMode() ? null : 'preview-colors';
    const digit = parseInt(code.replace('Digit', ''), 10);
    if (!isNaN(digit) && digit >= 4) {
      const themeIdx = digit - 4;
      const panel = document.querySelector(`#preview-theme-panels [data-theme-idx="${themeIdx}"]`);
      return panel ? panel.id : null;
    }
    return null;
  }

  function inputFocused() {
    const t = document.activeElement;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  }

  function settingsOpen() {
    return !document.getElementById('settings-screen').classList.contains('hidden');
  }

  function runDialogOpen() {
    return !document.getElementById('run-dialog-overlay').classList.contains('hidden');
  }

  function previewOpen() {
    return !document.getElementById('preview-screen').classList.contains('hidden');
  }

  function openPreview(panelId) {
    if (!previewOpen()) {
      renderPreviewTabs();
      document.getElementById('main-nav-area').classList.add('hidden');
      const ps = document.getElementById('preview-screen');
      ps.classList.remove('hidden');
      ps.style.display = 'flex';
      try {
        renderPreviewPanel(variableMaker(translateConfig(appState)));
      } catch (err) {
        console.error('Preview render failed:', err);
      }
    }
    document
      .querySelectorAll('#preview-screen .preview-tab-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.target === panelId));
    document
      .querySelectorAll('#preview-content .preview-panel, #preview-theme-panels > div')
      .forEach((p) => p.classList.toggle('active', p.id === panelId));
    syncPreviewBackground();
  }

  function closePreview() {
    document.getElementById('preview-screen').classList.add('hidden');
    document.getElementById('preview-screen').style.display = '';
    document.getElementById('main-nav-area').classList.remove('hidden');
    document
      .querySelectorAll('.sidebar-tab-btn')
      .forEach((b) => b.classList.toggle('active', b.dataset.tab === activeSidebarTab));
    const t = document.querySelector('.sidebar-tab-btn.active');
    if (t) t.focus();
  }

  function switchMainTab(tab) {
    if (previewOpen()) closePreview();
    switchSidebarTab(tab);
  }

  document.addEventListener('keydown', (e) => {
    if (!e.altKey || e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (inputFocused() || settingsOpen()) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (runDialogOpen()) {
        hideOverlay('run-dialog-overlay');
        proceedWithSync();
      } else if (!previewOpen()) {
        handleSubmit(pendingScope || 'all');
      }
      return;
    }
    if (e.code === 'Digit0') {
      e.preventDefault();
      switchMainTab('project');
    } else if (e.code === 'Digit1') {
      e.preventDefault();
      switchMainTab('color-groups');
    } else if (e.code === 'Digit2') {
      e.preventDefault();
      switchMainTab('roles-config');
    } else {
      const p = getPreviewPanelForCode(e.code);
      if (p) {
        e.preventDefault();
        openPreview(p);
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewOpen() && !settingsOpen()) closePreview();
  });
})();

// ── 6. BOOT ────────────────────────────────────────────────────────────────

try {
  if (window.parent === window) {
    // Standalone browser boot mockup: load from localStorage
    const savedConfig = localStorage.getItem('tw_state');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        ensureIds(parsed);
        setSavedState(parsed);
        appState = Object.assign({}, JSON.parse(JSON.stringify(_bootstrapConfig)), parsed);
        ensureVariations();
      } catch (err) {
        console.warn('Browser boot: failed to parse saved config', err);
      }
    } else {
      // No saved state — show quick start on next render tick
      setTimeout(() => {
        renderQuickStart();
        showOverlay('quickstart-overlay');
      }, 0);
    }
    const savedUiPrefs = localStorage.getItem('uiPrefsMeta');
    if (savedUiPrefs) {
      try {
        const parsed = JSON.parse(savedUiPrefs);
        if (parsed.scale !== undefined) uiPrefs.scale = parsed.scale;
        if (parsed.theme !== undefined) uiPrefs.theme = parsed.theme;
      } catch (err) {
        console.warn('Browser boot: failed to parse uiPrefs', err);
      }
    }
  }

  renderColorGroups();
  renderRoles();
  syncInputsFromState();
  syncUiSettingsInputs();
  applyUiPrefs();
  syncVersionButton();
} catch (e) {
  console.error('Boot render failed:', e);
}

const _themeObserver = new MutationObserver(() => {
  if (uiPrefs.theme === 'figma') applyUiPrefs();
});
_themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
_themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (uiPrefs.theme === 'figma') applyUiPrefs();
  });
}
