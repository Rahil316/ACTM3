/**
 * ============================================================================
 * UI ORCHESTRATOR
 * Main entry point for the plugin UI. Manages high-level rendering and
 * communication between sub-modules.
 * ============================================================================
 */

// 1. CONSTANTS & SHARED STATE
const UI_MODES = {
  plugin: ["ramp", "direct"],
  grouping: ["color", "role"],
  spread: ["steps", "contrast"],
  selection: ["By Contrast", "By Index", "Manual"],
};

let _previewLastHash = null;
let _previewCache = null;
let pendingScope = "all";
let savedState = null;
let lastCollectionCheckResult = [];
let lastRenameData = null;

// 2. CORE RENDERERS
const renderColorGroups = debounce(() => {
  if (activeSidebarTab !== "color-groups") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();

    const addButton = inputsUI.actionButton("+ Add Color", addGroup);
    fragment.appendChild(addButton);

    appState.colors.forEach((group, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2 color-group-card-plugin shadow-sm space-y-4 hover:shadow-md transition-all group relative overflow-hidden";
      card.draggable = true;

      // Drag & Drop Setup
      card.addEventListener("dragstart", (e) => {
        _colorDragSrcIdx = idx;
        e.dataTransfer.effectAllowed = "move";
        card.style.opacity = "0.5";
      });
      card.addEventListener("dragend", () => {
        _colorDragSrcIdx = null;
        card.style.opacity = "";
        document.querySelectorAll(".color-group-card-plugin").forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
      });
      card.addEventListener("dragover", (e) => {
        if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".color-group-card-plugin").forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
        card.classList.add("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (_colorDragSrcIdx === null || _colorDragSrcIdx === idx) return;
        const [moved] = appState.colors.splice(_colorDragSrcIdx, 1);
        appState.colors.splice(idx, 0, moved);
        renderColorGroups();
        schedulePreview();
      });

      card.innerHTML = "";
      const nodes = Components.ColorGroupCard(group, idx, appState);
      nodes.forEach(node => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);

const renderRoles = debounce(() => {
  if (activeSidebarTab !== "roles-config") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();

    const addButton = inputsUI.actionButton("+ Add Color Role", addRole);
    fragment.appendChild(addButton);

    appState.roles.forEach((role, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-2 role-card-plugin";
      card.draggable = true;

      // Role drag-and-drop
      card.addEventListener("dragstart", (e) => {
        _roleDragSrcIdx = idx;
        e.dataTransfer.effectAllowed = "move";
        card.style.opacity = "0.5";
      });
      card.addEventListener("dragend", () => {
        _roleDragSrcIdx = null;
        card.style.opacity = "";
        document.querySelectorAll(".role-card-plugin").forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
      });
      card.addEventListener("dragover", (e) => {
        if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        document.querySelectorAll(".role-card-plugin").forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
        card.classList.add("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("dragleave", (e) => {
        if (!card.contains(e.relatedTarget)) card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (_roleDragSrcIdx === null || _roleDragSrcIdx === idx) return;
        const [moved] = appState.roles.splice(_roleDragSrcIdx, 1);
        appState.roles.splice(idx, 0, moved);
        renderRoles();
        schedulePreview();
      });

      card.innerHTML = "";
      const nodes = Components.RoleGroupCard(role, idx, appState);
      nodes.forEach(node => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);

function renderSettingsVariations() {
  const container = document.getElementById("settings-variations-list");
  if (!container) return;
  const vars = appState.variations || [];
  const canDelete = vars.length > 1;
  container.innerHTML = vars
    .map(
      (v, idx) => `
          <div class="flex items-center gap-1.5">
            <div class="flex flex-col gap-0.5 shrink-0">
              <button onclick="moveSharedVariation(${idx},-1)" ${idx === 0 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▲</button>
              <button onclick="moveSharedVariation(${idx},1)" ${idx === vars.length - 1 ? "disabled" : ""} class="w-4 h-4 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-20 text-[9px]">▼</button>
            </div>
            <input type="text" value="${(v.name || "").replace(/"/g, "&quot;")}" placeholder="Name"
              oninput="updateSharedVariation(${idx},'name',this.value)"
              class="flex-1 h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
            <input type="text" value="${(v.shorthand || "").replace(/"/g, "&quot;")}" placeholder="Shorthand"
              oninput="updateSharedVariation(${idx},'shorthand',this.value)"
              class="w-[52px] h-[32px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-2 text-[12px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
            <button onclick="removeSharedVariation(${idx})" ${!canDelete ? "disabled" : ""} class="w-[28px] h-[32px] shrink-0 flex items-center justify-center rounded-[8px] bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--danger)]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[13px]">✕</button>
          </div>
        `,
    )
    .join("");
}

// 3. MESSAGE HANDLING
window.onmessage = (event) => {
  const msg = event.data?.pluginMessage;
  if (!msg) return;

  if (msg.type === "collection-check-result") {
    lastCollectionCheckResult = msg.existing || [];
    lastRenameData = msg.renames || null;
    setRunScope(pendingScope || "all");
    showOverlay("run-dialog-overlay");
    return;
  }

  if (msg.type === "load-config") {
    ensureIds(msg.state);
    savedState = JSON.parse(JSON.stringify(msg.state));
    appState = Object.assign({}, JSON.parse(JSON.stringify(demoConfig)), msg.state);

    if (appState.pluginMode === 0) appState.pluginMode = "ramp";
    else if (appState.pluginMode === 1) appState.pluginMode = "direct";

    ensureIds(appState);
    ensureVariations();
    renderColorGroups();
    renderRoles();
    syncInputsFromState();
    return;
  }

  if (msg.type === "processed-data-response") {
    const { content, exportType } = msg;
    const mimeMap = { json: "application/json", css: "text/css", csv: "text/csv", scss: "text/plain" };
    const extMap = { json: "json", css: "css", csv: "csv", scss: "scss" };
    const typeLabel = { json: "tokens", css: "variables", csv: "token_list", scss: "tokens" };
    triggerDownload(content, exportFileName(typeLabel[exportType] || exportType, extMap[exportType] || exportType), mimeMap[exportType] || "text/plain");
    return;
  }

  if (msg.type === "finish") {
    hideOverlay("loading-overlay");
    showOverlay("success-overlay");
    document.getElementById("success-results").innerHTML = `
            <p class="text-sm">Created: <span class="text-white font-bold">${msg.tally.created}</span></p>
            <p class="text-sm">Updated: <span class="text-white font-bold">${msg.tally.updated}</span></p>
            ${msg.tally.renamed > 0 ? `<p class="text-sm">Renamed: <span class="text-blue-300 font-bold">${msg.tally.renamed}</span></p>` : ""}
            <p class="text-sm">Failed: <span class="text-red-400 font-bold">${msg.tally.failed}</span></p>
          `;
    showSystemBanners(msg.errors || null, msg.result || null);
  }

  if (msg.type === "error") {
    hideOverlay("loading-overlay");
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = msg.message;
  }

  if (msg.type === "warning") {
    BannerManager.warn(msg.message, { dismissable: true, autoClose: 8000 });
  }

  if (msg.type === "load-ui-prefs-meta") {
    if (msg.prefs.scale !== undefined) uiPrefs.scale = msg.prefs.scale;
    if (msg.prefs.theme !== undefined) uiPrefs.theme = msg.prefs.theme;
    applyUiPrefs();
    syncUiSettingsInputs();
  }
};

// 4. UI PREFERENCES & RESIZE
function applyUiPrefs() {
  document.documentElement.style.setProperty("--ui-scale", uiPrefs.scale);
  document.body.style.zoom = uiPrefs.scale; // Fallback for some layouts
  const theme = uiPrefs.theme === "figma" ? (document.body.classList.contains("figma-dark") ? "dark" : "light") : uiPrefs.theme;
  document.body.setAttribute("data-ui-theme", theme);
}

function updateUiPref(key, value) {
  uiPrefs[key] = value;
  applyUiPrefs();
  parent.postMessage({ pluginMessage: { type: "save-ui-prefs-meta", prefs: uiPrefs } }, "*");
}

let isResizing = false;
let resizeOriginX = 0,
  resizeOriginY = 0;
let resizeStartW = 0,
  resizeStartH = 0;

document.getElementById("resize-handle").onmousedown = (e) => {
  isResizing = true;
  resizeOriginX = e.clientX;
  resizeOriginY = e.clientY;
  resizeStartW = window.innerWidth;
  resizeStartH = window.innerHeight;
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

function onMouseMove(e) {
  if (!isResizing) return;
  const w = Math.min(UI_DIMS.maxWidth, Math.max(UI_DIMS.minWidth, resizeStartW + (e.clientX - resizeOriginX)));
  const h = Math.min(UI_DIMS.maxHeight, Math.max(UI_DIMS.minHeight, resizeStartH + (e.clientY - resizeOriginY)));
  parent.postMessage({ pluginMessage: { type: "resize", width: w, height: h } }, "*");
}

function onMouseUp() {
  isResizing = false;
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
}

// 5. TOOLTIP LOGIC
const tooltipEl = document.getElementById("tooltip");
document.addEventListener(
  "mouseenter",
  (e) => {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest("[data-tooltip]");
    if (!target) return;

    const text = target.getAttribute("data-tooltip");
    tooltipEl.textContent = text;
    tooltipEl.classList.add("active");

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
  "mouseleave",
  (e) => {
    if (!e.target || !e.target.closest) return;
    const target = e.target.closest("[data-tooltip]");
    if (target) tooltipEl.classList.remove("active");
  },
  true,
);

// 6. EVENT LISTENERS & DELEGATION
document.getElementById("btn-settings").onclick = () => showSheet("settings-sheet");
document.getElementById("btn-more").onclick = () => showSheet("more-sheet");
document.getElementById("overlay").onclick = () => {
  if (document.getElementById("settings-sheet").classList.contains("open")) {
    updateSettingsFromInputs();
  }
  hideSheets();
};
document.getElementById("close-settings").onclick = () => {
  updateSettingsFromInputs();
  hideSheets();
};
document.getElementById("close-more").onclick = hideSheets;
document.getElementById("btn-run").onclick = () => handleSubmit("all");
document.getElementById("btn-import").onclick = () => document.getElementById("file-input").click();
document.getElementById("btn-preview").onclick = () => {
  const result = variableMaker(translateConfig(appState));
  document.querySelectorAll(".preview-tab-btn").forEach((b, i) => b.classList.toggle("active", i === 0));
  document.querySelectorAll(".preview-panel").forEach((p, i) => p.classList.toggle("active", i === 0));
  renderPreviewPanel(result);
  showOverlay("preview-overlay");
};
document.getElementById("preview-close").onclick = () => {
  hideOverlay("preview-overlay");
  document.getElementById("preview-overlay").classList.remove("theme-light", "theme-dark", "theme-ramps");
  BannerManager.clear();
};

document.getElementById("btn-sync-confirm").onclick = () => {
  hideOverlay("confirm-sync-overlay");
  proceedWithSync();
};

// Sidebar Tab Logic
const sidebarTabs = document.querySelectorAll(".sidebar-tab-btn");
sidebarTabs.forEach((btn) => {
  btn.onclick = () => {
    activeSidebarTab = btn.dataset.tab;
    sidebarTabs.forEach((b) => b.classList.toggle("active", b.dataset.tab === activeSidebarTab));
    if (activeSidebarTab === "color-groups") renderColorGroups();
    else if (activeSidebarTab === "roles-config") renderRoles();
  };
});

// Export Listeners (from More menu)
document.getElementById("opt-save-config").onclick = () => { exportConfig(); hideSheets(); };
document.getElementById("opt-export-css").onclick = () => { exportToCSS(); hideSheets(); };
document.getElementById("opt-export-csv").onclick = () => { exportToCSV(); hideSheets(); };
document.getElementById("opt-export-scss").onclick = () => { exportToSCSS(); hideSheets(); };

// Export Listeners (from Main Tab)
if (document.getElementById("btn-export-css")) document.getElementById("btn-export-css").onclick = exportToCSS;
if (document.getElementById("btn-export-csv")) document.getElementById("btn-export-csv").onclick = exportToCSV;
if (document.getElementById("btn-export-scss")) document.getElementById("btn-export-scss").onclick = exportToSCSS;
if (document.getElementById("btn-export-json")) document.getElementById("btn-export-json").onclick = exportConfig;
document.getElementById("opt-clear").onclick = () => {
  if (confirm("Are you sure you want to clear all data? This will reset the system to defaults.")) {
    appState = JSON.parse(JSON.stringify(demoConfig));
    ensureIds(appState);
    ensureVariations();
    savedState = null;
    renderColorGroups();
    renderRoles();
    syncInputsFromState();
    schedulePreview();
    hideSheets();
  }
};

// Preview tab switching
document.getElementById("preview-tabs").onclick = (e) => {
  const btn = e.target.closest(".preview-tab-btn");
  if (!btn) return;
  const target = btn.dataset.target;
  const overlay = document.getElementById("preview-overlay");
  overlay.classList.remove("theme-light", "theme-dark", "theme-ramps");
  if (target === "preview-light") overlay.classList.add("theme-light");
  else if (target === "preview-dark") overlay.classList.add("theme-dark");
  else overlay.classList.add("theme-ramps");
  document.querySelectorAll(".preview-tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".preview-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(target).classList.add("active");
};

// UI Scale/Theme Selects
document.getElementById("setting-ui-scale").onchange = (e) => {
  updateUiPref("scale", parseFloat(e.target.value) || 1.0);
};
document.getElementById("setting-ui-theme").onchange = (e) => {
  updateUiPref("theme", e.target.value);
};

// Import via File Input
document.getElementById("file-input").onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
  e.target.value = "";
};

// Drag & Drop Import
window.addEventListener("dragenter", (e) => {
  if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
    e.preventDefault();
    showOverlay("drop-overlay");
  }
});
document.getElementById("drop-overlay").ondragover = (e) => e.preventDefault();
document.getElementById("drop-overlay").ondragleave = () => hideOverlay("drop-overlay");
document.getElementById("drop-overlay").ondrop = (e) => {
  e.preventDefault();
  hideOverlay("drop-overlay");
  const file = e.dataTransfer.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => handleImportJSON(ev.target.result);
    reader.readAsText(file);
  }
};

// 7. INITIAL BOOT
renderColorGroups();
renderRoles();
syncInputsFromState();
syncUiSettingsInputs();
applyUiPrefs();
