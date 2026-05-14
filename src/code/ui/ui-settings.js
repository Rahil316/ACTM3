/**
 * ============================================================================
 * UI SETTINGS MANAGEMENT
 * Logic for syncing settings between appState and the UI.
 * ============================================================================
 */

function toggleBoolSetting(key) {
  appState[key] = !appState[key];
  syncOutputToggles();
  if (key === "allowRoleVariations" || key === "includeDescriptions") {
    renderColorGroups();
    renderRoles();
  }
  schedulePreview();
}

function setTokenGrouping(idx) {
  appState.variableStructure = UI_MODES.grouping[idx] || "color";
  syncOutputToggles();
  schedulePreview();
}

function syncOutputToggles() {
  const tg = appState.variableStructure || "color";
  // Sync all toggle pills (settings sheet + run dialog)
  ["embedDirectly", "useShorthandColors", "useShorthandRoles", "useShorthandVariations", "includeGlobalColors", "includeAlphaTints", "allowRoleVariations", "includeDescriptions"].forEach((key) => {
    ["toggle-" + key, "rd-toggle-" + key].forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.toggle("on", !!appState[key]);
    });
  });
  // Show/hide constants sub-options
  const constOpts = document.getElementById("constants-options");
  if (constOpts) constOpts.classList.toggle("hidden", !appState.includeGlobalColors);
  const opacRow = document.getElementById("opacity-values-row");
  if (opacRow) opacRow.classList.toggle("hidden", !appState.includeAlphaTints);
  // Sync grouping segment buttons
  [
    ["seg-group-color", "rd-seg-group-color"],
    ["seg-group-role", "rd-seg-group-role"],
  ].forEach(([settingsId, rdId]) => {
    const isColor = tg === "color";
    const isRole = tg === "role";
    const s = document.getElementById(settingsId);
    const r = document.getElementById(rdId);
    if (settingsId.includes("color")) {
      if (s) s.classList.toggle("active", isColor);
      if (r) r.classList.toggle("active", isColor);
    } else {
      if (s) s.classList.toggle("active", isRole);
      if (r) r.classList.toggle("active", isRole);
    }
  });
  // Sync mode toggle buttons
  const isDirect = appState.pluginMode === "direct";
  const mbRamp = document.getElementById("mode-btn-ramp");
  const mbDirect = document.getElementById("mode-btn-direct");
  if (mbRamp) mbRamp.classList.toggle("active", !isDirect);
  if (mbDirect) mbDirect.classList.toggle("active", isDirect);

  // Hide ramp-specific settings in Adaptive Engine mode
  const rampSection = document.getElementById("settings-ramp-section");
  if (rampSection) rampSection.classList.toggle("hidden", isDirect);

  // Hide Tonal Scale Collection and Embed Colors Directly in Direct Contrast mode
  const tonalCollRow = document.getElementById("settings-tonal-collection-row");
  if (tonalCollRow) tonalCollRow.classList.toggle("hidden", isDirect);
  const embedDirectlyRow = document.getElementById("settings-embed-directly-row");
  if (embedDirectlyRow) embedDirectlyRow.classList.toggle("hidden", isDirect);

  // Spread Unit visibility: hidden in Direct mode or when Manual is selected
  const spreadUnitRow = document.getElementById("settings-spread-unit-row");
  if (spreadUnitRow) spreadUnitRow.classList.toggle("hidden", isDirect || appState.baseSelection === "Manual");

  // Sync spread unit buttons
  const suSteps = document.getElementById("su-btn-steps");
  const suContrast = document.getElementById("su-btn-contrast");
  if (suSteps) suSteps.classList.toggle("active", (appState.spreadUnit || "steps") === "steps");
  if (suContrast) suContrast.classList.toggle("active", appState.spreadUnit === "contrast");

  // In Direct mode, force Base Selection away from incompatible options
  if (isDirect && appState.baseSelection === "By Index") {
    appState.baseSelection = "By Contrast";
    const bsEl = document.getElementById("setting-baseSelection");
    if (bsEl) bsEl.value = "By Contrast";
  }
  // Hide "By Index" option in Base Selection select when in Direct mode
  const byIndexOpt = document.getElementById("base-selection-opt-byindex");
  if (byIndexOpt) byIndexOpt.hidden = isDirect;

  // Update preview tab label contextually
  const previewTabColors = document.getElementById("preview-tab-colors");
  if (previewTabColors) previewTabColors.textContent = isDirect ? "Solved Colors" : "Tonal Scale";

  renderSettingsVariations();

  // Update settings-sheet name format preview
  const sampleColor = appState.colors && appState.colors[0];
  const sampleRole = appState.roles && appState.roles[0];
  if (sampleColor && sampleRole) {
    const cLabel = appState.useShorthandColors ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
    const rLabel = appState.useShorthandRoles ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
    const stepLabel = appState.variations && appState.variations[2] ? (appState.useShorthandVariations && appState.variations[2].shorthand ? appState.variations[2].shorthand : appState.variations[2].name) : "3";
    const preview = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
    const el = document.getElementById("name-format-preview");
    if (el) el.textContent = preview;
  }
}

function setPluginMode(idx) {
  const mode = UI_MODES.plugin[idx];
  if (!mode) return;
  appState.pluginMode = mode;
  syncOutputToggles();
  renderColorGroups();
  renderRoles();
  schedulePreview();
}

function setSpreadUnit(idx) {
  appState.spreadUnit = UI_MODES.spread[idx] || "steps";
  syncOutputToggles();
  renderRoles();
  schedulePreview();
}

function setBaseSelection(idx) {
  appState.baseSelection = UI_MODES.selection[idx] || "By Contrast";
  syncUiSettingsInputs();
  renderRoles();
  syncOutputToggles();
  schedulePreview();
}

function updateSettingsFromInputs() {
  appState.name = document.getElementById("setting-name").value;
  appState.tonalScaleCollectionName = document.getElementById("setting-tonalScaleCollectionName").value.trim() || "_scale";
  appState.tokenCollectionName = document.getElementById("setting-tokenCollectionName").value.trim() || "contextual";
  const sanitizeHex = (id) => {
    const el = document.getElementById(id);
    const clean = el.value
      .replace(/[^0-9A-Fa-f]/g, "")
      .toUpperCase()
      .substring(0, 6);
    if (el.value !== clean) el.value = clean;
    return clean;
  };
  if (!appState.themes)
    appState.themes = [
      { name: "light", bg: "FFFFFF" },
      { name: "dark", bg: "000000" },
    ];
  appState.themes[0].bg = sanitizeHex("setting-light-bg");
  appState.themes[1].bg = sanitizeHex("setting-dark-bg");

  // Color Settings
  let wCount = parseInt(document.getElementById("setting-colorSteps").value);
  appState.colorSteps = isNaN(wCount) ? 25 : Math.max(1, Math.min(100, wCount));
  appState.scaleAlgorithm = document.getElementById("setting-scaleAlgorithm").value;
  appState.colorStepNames = document.getElementById("setting-colorStepNames").value;

  // Role Settings
  const bsSelect = document.getElementById("setting-baseSelection");
  appState.baseSelection = UI_MODES.selection[bsSelect.selectedIndex] || "By Contrast";

  // Constants
  appState.globalColorsCollectionName = document.getElementById("setting-globalColorsCollectionName").value.trim() || "_constants";
  appState.alphaValues = document.getElementById("setting-alphaValues").value;

  renderColorGroups();
  renderRoles();
  schedulePreview();
}

function syncUiSettingsInputs() {
  const scaleEl = document.getElementById("setting-ui-scale");
  const themeEl = document.getElementById("setting-ui-theme");
  if (scaleEl) scaleEl.value = String(uiPrefs.scale);
  if (themeEl) themeEl.value = uiPrefs.theme;
}

function syncInputsFromState() {
  document.getElementById("setting-name").value = appState.name || "";
  document.getElementById("setting-tonalScaleCollectionName").value = appState.tonalScaleCollectionName || "_scale";
  document.getElementById("setting-tokenCollectionName").value = appState.tokenCollectionName || "contextual";
  syncOutputToggles();
  const themes = appState.themes || [{ bg: "FFFFFF" }, { bg: "000000" }];
  document.getElementById("setting-light-bg").value = themes[0].bg;
  document.getElementById("setting-dark-bg").value = themes[1].bg;

  // Color Settings
  document.getElementById("setting-colorSteps").value = appState.colorSteps;
  document.getElementById("setting-scaleAlgorithm").value = appState.scaleAlgorithm || "Natural";
  document.getElementById("setting-colorStepNames").value = appState.colorStepNames || "";

  // Role Settings
  const bsEl = document.getElementById("setting-baseSelection");
  if (bsEl) {
    const idx = UI_MODES.selection.indexOf(appState.baseSelection || "By Contrast");
    bsEl.selectedIndex = idx !== -1 ? idx : 0;
  }

  // Constants
  document.getElementById("setting-globalColorsCollectionName").value = appState.globalColorsCollectionName || "_constants";
  document.getElementById("setting-alphaValues").value = appState.alphaValues || "10, 25, 50, 75, 90";

  renderSettingsVariations();
}
