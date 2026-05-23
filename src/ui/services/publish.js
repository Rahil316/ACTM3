/**
 * ============================================================================
 * Token Wand SERVICE: PUBLISH
 * Figma sync dispatch, dialog rendering, import/export, post-sync reporting.
 * ============================================================================
 */

// ── DIALOG RENDERERS ─────────────────────────────────────────────────────────
// Each function builds the full content of its overlay slot.
// Call before showOverlay() so the slot is populated when it becomes visible.

function renderLoadingOverlay() {
  const slot = document.getElementById("loading-overlay");
  if (!slot) return;
  slot.innerHTML = "";
  slot.appendChild(el("div", { class: "w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" }));
  slot.appendChild(el("p", { class: "text-xl font-bold text-[var(--text-primary)]" }, "Creating Variables..."));
  slot.appendChild(el("p", { class: "text-[var(--text-muted)]" }, "Generating color tokens and thematic variations in Figma."));
}

function renderSuccessDialog(tally) {
  const slot = document.getElementById("success-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const iconEl = el("div", { class: "w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-500" });
  iconEl.innerHTML = Icons.Check;

  const resultsEl = el("div", { id: "success-results", class: "text-[var(--text-muted)] space-y-1" });
  if (tally) {
    [
      ["Created", tally.created, "text-white"],
      ["Updated", tally.updated, "text-white"],
      ...(tally.renamed > 0 ? [["Renamed", tally.renamed, "text-blue-300"]] : []),
      ["Failed", tally.failed, "text-red-400"],
    ].forEach(([label, count, cls]) => {
      resultsEl.appendChild(el("p", { class: "text-sm" }, [`${label}: `, el("span", { class: `${cls} font-bold` }, String(count))]));
    });
  }

  const inner = el("div", { class: "flex-1 flex items-center justify-center p-8 text-center flex-col gap-4" }, [
    iconEl,
    el("h2", { class: "text-2xl font-bold text-[var(--text-primary)]" }, "Success!"),
    resultsEl,
    el(
      "button",
      {
        onclick: () => hideOverlay("success-overlay"),
        class:
          "mt-4 h-[36px] px-6 text-[12px] font-semibold rounded-[8px] bg-[var(--accent)] border border-[var(--accent)] text-white hover:opacity-90 cursor-pointer transition-all",
      },
      "Back to Editor",
    ),
  ]);
  slot.appendChild(inner);
}

function renderValidationWarningDialog(issues, onContinue) {
  const slot = document.getElementById("error-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  slot.appendChild(
    el("div", { class: "w-16 h-16 bg-[var(--warning)]/10 rounded-full flex items-center justify-center text-[var(--warning)]" }, [Icons.AlertTriangle]),
  );
  slot.appendChild(el("h2", { class: "text-xl font-bold text-[var(--text-primary)]" }, `${issues.length} issue${issues.length > 1 ? "s" : ""} found`));
  slot.appendChild(el("p", { class: "text-[var(--text-muted)] text-[12px] text-center" }, "These may corrupt variables in Figma. Review before continuing."));

  const list = el("ul", { class: "w-full text-left space-y-2 max-h-48 overflow-y-auto" });
  issues.forEach((msg) => {
    list.appendChild(
      el("li", { class: "text-[12px] text-[var(--text-secondary)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 rounded-[6px] px-3 py-2" }, msg),
    );
  });
  slot.appendChild(list);

  slot.appendChild(
    el("div", { class: "flex gap-2 w-full" }, [
      el(
        "button",
        {
          onclick: () => hideOverlay("error-overlay"),
          class:
            "flex-1 h-[36px] px-4 text-[12px] font-medium rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all",
        },
        "Go back",
      ),
      el(
        "button",
        {
          onclick: () => {
            hideOverlay("error-overlay");
            onContinue();
          },
          class:
            "flex-1 h-[36px] px-4 text-[12px] font-medium rounded-[8px] bg-[var(--warning)] text-white hover:opacity-90 cursor-pointer transition-all border-0",
        },
        "Continue Anyway",
      ),
    ]),
  );
}

function renderErrorDialog(message) {
  const slot = document.getElementById("error-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const iconEl = el("div", { class: "w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center text-red-500" });
  iconEl.innerHTML = Icons.Close;

  slot.appendChild(iconEl);
  slot.appendChild(el("h2", { class: "text-2xl font-bold text-[var(--text-primary)]" }, "Error"));
  slot.appendChild(el("p", { id: "error-message", class: "text-[var(--danger)]" }, message || ""));
  slot.appendChild(
    el(
      "button",
      {
        onclick: () => hideOverlay("error-overlay"),
        class:
          "mt-4 h-[36px] px-6 text-[12px] font-medium rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all",
      },
      "Dismiss",
    ),
  );
}

function renderRunDialog() {
  const slot = document.getElementById("run-dialog-overlay");
  if (!slot) return;
  slot.innerHTML = "";

  const header = el("div", { class: "px-4 py-3 flex items-center justify-between border-b border-[var(--border)]" }, [
    el("h2", { class: "text-[17px] font-bold text-[var(--text-primary)]" }, "Apply to Figma"),
    el(
      "button",
      {
        onclick: () => hideOverlay("run-dialog-overlay"),
        class:
          "h-[36px] px-3 text-[12px] font-medium rounded-[8px] bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] cursor-pointer transition-all",
      },
      "Cancel",
    ),
  ]);

  const body = el("div", { class: "flex-1 overflow-y-auto p-4 space-y-5" }, [
    // Scope
    el("div", { id: "rd-scope-section", class: "space-y-2" }, [
      panelUI.sectionLabel("WHAT TO UPDATE"),
      panelUI.segmented([
        { id: "rd-scope-all", label: "Everything", onclick: () => setRunScope("all") },
        { id: "rd-scope-groups", label: "Scale Only", onclick: () => setRunScope("groups") },
        { id: "rd-scope-roles", label: "Roles Only", onclick: () => setRunScope("roles") },
      ]),
    ]),

    // Output options
    el("div", { class: "space-y-2" }, [
      panelUI.sectionLabel("OUTPUT OPTIONS"),
      el(
        "div",
        { id: "embed-colors-directly", class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" },
        [
          el("div", {}, [
            el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Embed Colors Directly"),
            el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "Write hex values into tokens instead of referencing the color scales"),
          ]),
          panelUI.togglePill("rd-toggle-resolveTokensDirectly", () => {
            toggleBoolSetting("resolveTokensDirectly");
            refreshRunDialog();
          }),
        ],
      ),
      el("div", { class: "space-y-1" }, [
        el("label", { class: "text-[var(--text-muted)] text-[12px] font-medium ml-1" }, "Variable Structure"),
        panelUI.segmented([
          {
            id: "rd-seg-group-color",
            label: "Color-first color/role/step",
            onclick: () => {
              setTokenGrouping(0);
              refreshRunDialog();
            },
          },
          {
            id: "rd-seg-group-role",
            label: "Role-first role/color/step",
            onclick: () => {
              setTokenGrouping(1);
              refreshRunDialog();
            },
          },
        ]),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [
          el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Colors"),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. primary → pr"),
        ]),
        panelUI.togglePill("rd-toggle-useShorthandColors", () => {
          toggleBoolSetting("useShorthandColors");
          refreshRunDialog();
        }),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [
          el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Roles"),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. Text → tx"),
        ]),
        panelUI.togglePill("rd-toggle-useShorthandRoles", () => {
          toggleBoolSetting("useShorthandRoles");
          refreshRunDialog();
        }),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [
          el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Variations"),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. Darker → dk"),
        ]),
        panelUI.togglePill("rd-toggle-useShorthandVariations", () => {
          toggleBoolSetting("useShorthandVariations");
          refreshRunDialog();
        }),
      ]),
      el("div", { class: "flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-[8px] border border-[var(--border)]" }, [
        el("div", {}, [
          el("p", { class: "text-[13px] font-medium text-[var(--text-primary)]" }, "Use shorthand for Steps"),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5" }, "e.g. 500 → 5"),
        ]),
        panelUI.togglePill("rd-toggle-useShorthandSteps", () => {
          toggleBoolSetting("useShorthandSteps");
          refreshRunDialog();
        }),
      ]),
      el("div", { class: "bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3 py-2" }, [
        el("p", { class: "text-[11px] text-[var(--text-muted)]" }, "Example variable name:"),
        el("p", { id: "rd-name-preview", class: "text-[12px] font-mono text-[var(--accent)] mt-0.5" }),
      ]),
    ]),

    // Collections
    el("div", { class: "space-y-2" }, [panelUI.sectionLabel("COLLECTIONS"), el("div", { id: "rd-collections", class: "space-y-1.5" })]),

    // Renames
    el("div", { id: "rd-renames", class: "hidden space-y-2" }, [
      panelUI.sectionLabel("VARIABLES TO RENAME"),
      el("div", { id: "rd-renames-list", class: "space-y-1.5" }),
      el(
        "p",
        { class: "text-[11px] text-[var(--text-muted)] px-1 leading-relaxed" },
        "Existing variables matching the previous names will be renamed in place — no variables are deleted or recreated.",
      ),
    ]),

    // Summary
    el("div", { class: "space-y-2" }, [panelUI.sectionLabel("SUMMARY"), el("div", { id: "rd-summary", class: "space-y-1" })]),

    // Warning
    el("div", { id: "rd-warnings", class: "hidden bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-[8px] p-3 space-y-1" }, [
      el("p", { class: "text-[12px] font-bold text-[var(--warning)]" }, "⚠ Existing Collections Detected"),
      el("p", { id: "rd-warning-text", class: "text-[11px] text-[var(--text-muted)]" }),
    ]),
  ]);

  const footer = el("div", { class: "p-4 border-t border-[var(--border)]" }, [
    el(
      "button",
      {
        id: "btn-run-confirm",
        class:
          "w-full h-[40px] px-4 text-[13px] font-semibold rounded-[8px] bg-[var(--accent)] border border-[var(--accent)] text-white hover:opacity-90 cursor-pointer transition-all",
      },
      "Apply to Figma",
    ),
  ]);

  slot.appendChild(header);
  slot.appendChild(body);
  slot.appendChild(footer);
}

function _buildImportWarningIcon() {
  return el("div", { class: "w-20 h-20 bg-[var(--warning)]/10 rounded-full flex items-center justify-center text-[var(--warning)]" }, [Icons.AlertTriangle]);
}

// ── FIGMA SYNC ────────────────────────────────────────────────────────────────

function _proceedToCollectionCheck(scope) {
  pendingScope = scope;
  parent.postMessage(
    {
      pluginMessage: {
        type: "check-collections",
        colorName: appState.scaleCollectionName || "_scale",
        tokenColName: appState.tokenCollectionName || "color tokens",
        state: appState,
        savedState: getSavedState(),
      },
    },
    "*",
  );
}

function handleSubmit(scope = "all") {
  const issues = validateState();
  if (issues) {
    renderValidationWarningDialog(issues, () => _proceedToCollectionCheck(scope));
    showOverlay("error-overlay");
    return;
  }
  _proceedToCollectionCheck(scope);
}

function proceedWithSync() {
  renderLoadingOverlay();
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creator", state: appState, scope: pendingScope, savedState: getSavedState() } }, "*");
  }, 50);
}

function setRunScope(scope) {
  pendingScope = scope;
  ["all", "groups", "roles"].forEach((s) => {
    const btn = document.getElementById("rd-scope-" + s);
    if (btn) btn.classList.toggle("active", s === scope);
  });
  refreshRunDialog();
}

function refreshRunDialog() {
  const existing = lastCollectionCheckResult;
  const colorName = appState.scaleCollectionName || "_scale";
  const tokenColName = appState.tokenCollectionName || "color tokens";
  const isDirect = isDirectMode();
  const skipScales = appState.resolveTokensDirectly || isDirect || appState.includeColorScalesCollection === false;
  const tg = appState.tokenGrouping || "color";
  const shortC = appState.useShorthandColors;
  const shortR = appState.useShorthandRoles;
  const scope = pendingScope || "all";

  const rdToggleKeys = [
    ["rd-toggle-resolveTokensDirectly", "resolveTokensDirectly"],
    ["rd-toggle-useShorthandColors", "useShorthandColors"],
    ["rd-toggle-useShorthandRoles", "useShorthandRoles"],
    ["rd-toggle-useShorthandVariations", "useShorthandVariations"],
    ["rd-toggle-useShorthandSteps", "useShorthandSteps"],
  ];
  rdToggleKeys.forEach(function (pair) {
    var btn = document.getElementById(pair[0]);
    if (btn) btn.classList.toggle("on", !!appState[pair[1]]);
  });
  var tgColorBtn = document.getElementById("rd-seg-group-color");
  var tgRoleBtn = document.getElementById("rd-seg-group-role");
  if (tgColorBtn) tgColorBtn.classList.toggle("active", tg !== "role");
  if (tgRoleBtn) tgRoleBtn.classList.toggle("active", tg === "role");

  const scopeSection = document.getElementById("rd-scope-section");
  if (scopeSection) scopeSection.classList.toggle("hidden", isDirect);
  const skipScalesRow = document.getElementById("embed-colors-directly");
  if (skipScalesRow) skipScalesRow.classList.toggle("hidden", isDirect);

  const colsEl = document.getElementById("rd-collections");
  if (colsEl) {
    colsEl.innerHTML = "";
    const entries = [];
    if (!skipScales && scope !== "roles") {
      const exists = existing.includes(colorName);
      entries.push([colorName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (scope !== "groups") {
      const exists = existing.includes(tokenColName);
      entries.push([tokenColName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (appState.includeSourceColors) {
      const constName = appState.sourceCollectionName || "_constants";
      const exists = existing.includes(constName);
      entries.push([constName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (entries.length) {
      entries.forEach(([name, label, isExisting]) => {
        colsEl.appendChild(
          el("div", { class: "flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2" }, [
            el("span", { class: "text-[13px] text-[var(--text-primary)] font-mono" }, name),
            el(
              "span",
              {
                class: `text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}`,
              },
              label,
            ),
          ]),
        );
      });
    } else {
      colsEl.appendChild(el("p", { class: "text-[12px] text-[var(--text-muted)] px-1" }, "No collections will be modified for this scope."));
    }
  }

  const sampleColor = appState.colors[0] || { name: "Primary", shorthand: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shorthand: "tx" };
  const cLabel = shortC ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const sampleVar = (appState.variations && appState.variations[2]) || (appState.variations && appState.variations[0]);
  const stepLabel = sampleVar ? (appState.useShorthandVariations && sampleVar.shorthand ? sampleVar.shorthand : sampleVar.name) : "default";
  const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("rd-name-preview");
  if (previewEl) previewEl.textContent = exName;

  const renameEl = document.getElementById("rd-renames");
  const renameListEl = document.getElementById("rd-renames-list");
  if (renameEl && renameListEl) {
    const summary = lastRenameData && lastRenameData.summary;
    const scaleCount = isDirect ? 0 : (summary && summary.scaleCount) || 0;

    const tokenCount = (summary && summary.tokenCount) || 0;
    const changes = ((summary && summary.changes) || []).filter((ch) => (isDirect ? ch.type !== "stepNames" : true));

    if (scaleCount + tokenCount > 0 && changes.length > 0) {
      renameEl.classList.remove("hidden");
      renameListEl.innerHTML = "";
      const typeLabels = { color: "Color", role: "Role", stepNames: "Scale Steps", roleStepNames: "Variation Levels", grouping: "Grouping" };
      changes.forEach((ch) => {
        renameListEl.appendChild(
          el("div", { class: "flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0" }, [
            el("span", { class: "text-[11px] text-[var(--text-muted)] w-[68px] shrink-0" }, typeLabels[ch.type] || ch.type),
            el("span", { class: "text-[11px] font-mono text-[var(--text-primary)] truncate flex-1" }, ch.from),
            el("span", { class: "text-[11px] text-[var(--accent)] shrink-0 px-0.5" }, "→"),
            el("span", { class: "text-[11px] font-mono text-[var(--accent)] truncate flex-1" }, ch.to),
          ]),
        );
      });
      const parts = [
        scaleCount > 0 ? `${scaleCount} scale var${scaleCount > 1 ? "s" : ""}` : "",
        tokenCount > 0 ? `${tokenCount} token var${tokenCount > 1 ? "s" : ""}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      renameListEl.appendChild(
        el("div", { class: "flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5" }, [
          el("span", { class: "inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" }),
          el("span", {}, `${parts} will be renamed`),
        ]),
      );
    } else {
      renameEl.classList.add("hidden");
    }
  }

  const sumEl = document.getElementById("rd-summary");
  if (sumEl) {
    sumEl.innerHTML = "";
    const colorList = appState.colors.map((c) => `${c.name}${c.shorthand ? ` (${c.shorthand})` : ""}`).join(", ");
    const roleList = appState.roles.map((r) => `${r.name}${r.shorthand ? ` (${r.shorthand})` : ""}`).join(", ");
    const rows = [
      ["Project Name", appState.name || "—"],
      [`Colors x${appState.colors.length}`, colorList],
      [`Roles x${appState.roles.length}`, roleList],
      [
        "Themes",
        appState.themes
          ? appState.themes
              .map(function (t) {
                return t.name;
              })
              .join(", ")
          : "—",
      ],
      ["Mode", isDirect ? "Direct" : "Scale"],
      ...(isDirect
        ? []
        : [
            ["Color Steps", String(appState.scaleLength || 25)],
            ["Scale Algorithm", appState.scaleAlgorithm || "Natural"],
          ]),
    ];
    rows.forEach(([label, value]) => {
      sumEl.appendChild(
        el("div", { class: "flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0" }, [
          el("span", { class: "text-[var(--text-muted)] shrink-0" }, label),
          el("span", { class: "text-[var(--text-primary)] text-right text-[11px]" }, value),
        ]),
      );
    });
  }

  const warnEl = document.getElementById("rd-warnings");
  if (warnEl) {
    const relevant = existing.filter((n) => (n === colorName && !skipScales && scope !== "roles") || (n === tokenColName && scope !== "groups"));
    if (relevant.length > 0) {
      warnEl.classList.remove("hidden");
      document.getElementById("rd-warning-text").textContent =
        `${relevant.map((n) => `"${n}"`).join(" and ")} already exist. Variables will be added or updated — nothing deleted.`;
    } else {
      warnEl.classList.add("hidden");
    }
  }
}

// ── IMPORT ────────────────────────────────────────────────────────────────────

let _pendingImportData = null;

function handleImportJSON(json) {
  try {
    const imported = typeof json === "string" ? JSON.parse(json) : json;
    if (!imported.colors || !imported.roles) throw new Error("Invalid Token Wand file — missing colors or roles.");
    _pendingImportData = imported;
    createDialogue("confirm-import-overlay", {
      layout: "stacked",
      icon: _buildImportWarningIcon(),
      title: "Replace Configuration?",
      body: "Loading this file will replace all current palettes, roles, and settings.",
      buttons: [
        {
          label: "Save Current & Import",
          variant: "primary",
          action: () => {
            exportConfig();
            finalizeImport();
          },
        },
        {
          label: "Import & Replace",
          variant: "secondary",
          action: () => {
            finalizeImport();
          },
        },
        { label: t("cancel"), variant: "ghost" },
      ],
    });
  } catch (err) {
    BannerManager.error("Import failed: " + err.message);
  }
}

function finalizeImport() {
  if (!_pendingImportData) return;
  loadState(_pendingImportData);
  _pendingImportData = null;
  syncInputsFromState();
  renderColorGroups();
  renderRoles();
  BannerManager.success("Config imported successfully");
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

function exportConfig() {
  const data = JSON.stringify(appState, null, 2);
  triggerDownload(data, exportFileName("config", "wand"), "application/octet-stream");
}

function exportToCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "css" } }, "*");
}
function exportToCSV() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "csv" } }, "*");
}
function exportToSCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "scss" } }, "*");
}

function _exportSingle(formatId) {
  if (formatId === "wand") {
    exportConfig();
    return;
  }
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: formatId } }, "*");
}

// ── EXPORT SHEET ──────────────────────────────────────────────────────────────

let selectedFormats = new Set(["css", "scss", "wand"]);

const FORMAT_DEFS = [
  {
    id: "css",
    label: "CSS Variables",
    subtitle: "Per-theme custom properties + :root scale",
    color: "var(--creative)",
    iconKey: "Code",
    files: (themes) => ["css/scale.css", ...themes.map((t) => "css/themes/" + t + ".css")],
  },
  {
    id: "scss",
    label: "SCSS",
    subtitle: "Scale vars, token maps, apply-theme mixin",
    color: "var(--secondary)",
    iconKey: "Layers",
    files: () => ["scss/scale.scss", "scss/tokens.scss", "scss/index.scss"],
  },
  {
    id: "tailwind",
    label: "Tailwind Config",
    subtitle: "theme.extend.colors with CSS var references",
    color: "#0ea5e9",
    iconKey: "Code",
    files: () => ["tailwind/tailwind.config.js"],
  },
  {
    id: "dtcg",
    label: "W3C Design Tokens (DTCG)",
    subtitle: "W3C DTCG spec — works with Tokens Studio",
    color: "#7c3aed",
    iconKey: "File",
    files: (themes) => ["dtcg/scale.json", ...themes.map((t) => "dtcg/themes/" + t + ".json")],
  },
  {
    id: "style-dictionary",
    label: "Style Dictionary",
    subtitle: "SD v3 input format — transform to any platform",
    color: "#f59e0b",
    iconKey: "File",
    files: (themes) => ["style-dictionary/global.json", ...themes.map((t) => "style-dictionary/" + t + ".json")],
  },
  {
    id: "ios-swift",
    label: "iOS / Swift",
    subtitle: "UIColor + SwiftUI Color static extensions",
    color: "#64748b",
    iconKey: "Code",
    files: (themes) => themes.map((t) => "ios/" + t.charAt(0).toUpperCase() + t.slice(1) + "Colors.swift"),
  },
  {
    id: "android",
    label: "Android XML",
    subtitle: "values/ + values-night/ color resources",
    color: "#22c55e",
    iconKey: "Code",
    files: (themes) => ["android/res/values/colors.xml", ...themes.slice(1).map((t) => "android/res/values-" + t + "/colors.xml")],
  },
  {
    id: "rn-ts",
    label: "React Native TypeScript",
    subtitle: "Typed token objects with useTokens() helper",
    color: "#38bdf8",
    iconKey: "Code",
    files: (themes) => ["rn/tokens/index.ts", ...themes.map((t) => "rn/tokens/" + t + ".ts")],
  },
  {
    id: "csv",
    label: "CSV Spreadsheet",
    subtitle: "Scale + role token table with contrast data",
    color: "var(--discovery)",
    iconKey: "File",
    files: () => ["tokens.csv"],
  },
  {
    id: "wand",
    label: "Token Wand Config (.wand)",
    subtitle: "Full plugin config — reimportable",
    color: "var(--success)",
    iconKey: "Save",
    files: () => ["config.wand"],
  },
];

function _themeNames() {
  return (appState.themes || []).map((t) =>
    t.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, ""),
  );
}

function renderFormatCard(def) {
  const themes = _themeNames();
  const files = def.files(themes);
  const isSelected = selectedFormats.has(def.id);

  const fileTree = el(
    "div",
    { class: "mt-1.5 bg-[var(--bg-app)] rounded-[6px] px-2.5 py-2 font-mono text-[10px] text-[var(--text-muted)] leading-[1.7]" },
    files.map((f) => el("div", {}, f)),
  );

  const iconEl = el("div", {
    class: "w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0",
    style: `background:${def.color}22; color:${def.color}`,
  });
  iconEl.innerHTML = Icons[def.iconKey] || "";

  const checkbox = el("div", {
    class: `w-4 h-4 rounded-[4px] border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border)]"}`,
  });
  if (isSelected)
    checkbox.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const exportBtn = el(
    "button",
    {
      onclick: (e) => {
        e.stopPropagation();
        _exportSingle(def.id);
        BannerManager.show({ type: "info", message: "Exporting " + def.label + "…", autoClose: 2000 });
      },
      class:
        "shrink-0 h-[26px] px-2.5 rounded-[6px] text-[11px] font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors",
    },
    "↓ Export",
  );

  const card = el(
    "div",
    {
      "data-format-id": def.id,
      class: `p-3 rounded-[10px] border cursor-pointer transition-all ${isSelected ? "border-[var(--accent)] bg-[var(--accent)]/5" : "border-[var(--border)] bg-[var(--bg-card)]"}`,
      onclick: () => {
        if (selectedFormats.has(def.id)) selectedFormats.delete(def.id);
        else selectedFormats.add(def.id);
        renderExportSheet();
      },
    },
    [
      el("div", { class: "flex items-center gap-2.5" }, [
        checkbox,
        iconEl,
        el("div", { class: "flex-1 min-w-0" }, [
          el("p", { class: "text-[13px] font-semibold text-[var(--text-primary)] leading-tight" }, def.label),
          el("p", { class: "text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed" }, def.subtitle),
        ]),
        exportBtn,
      ]),
      fileTree,
    ],
  );

  return card;
}

function renderExportSheet() {
  const list = document.getElementById("export-format-list");
  if (!list) return;
  list.innerHTML = "";
  FORMAT_DEFS.forEach((def) => list.appendChild(renderFormatCard(def)));

  const zipBtn = document.getElementById("btn-export-zip");
  if (zipBtn) {
    const count = selectedFormats.size;
    zipBtn.textContent = count > 0 ? "Export " + count + " Format" + (count > 1 ? "s" : "") + " as ZIP" : "Select formats above";
    zipBtn.disabled = count === 0;
    zipBtn.style.opacity = count === 0 ? "0.4" : "";
  }
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFileName(type, ext) {
  const name = (appState.name || "design_system").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  return `${name}_${type}_${date}_${time}.${ext}`;
}

// ── POST-SYNC REPORTER ────────────────────────────────────────────────────────

function showSystemBanners(errors, result = null) {
  if (!errors) return;

  const accessFails = [];
  if (result && result.tokens) {
    for (const mode of Object.keys(result.tokens)) {
      const modeTokens = result.tokens[mode];
      if (!modeTokens) continue;
      for (const clrName in modeTokens) {
        for (const roleId in modeTokens[clrName]) {
          const roleTokens = modeTokens[clrName][roleId];
          for (const varKey in roleTokens) {
            const tkn = roleTokens[varKey];
            if (tkn.contrast && tkn.contrast.rating === "Fail") {
              accessFails.push(`${clrName}/${tkn.role} (${mode})`);
            }
          }
        }
      }
    }
  }

  const critCount = errors.critical ? errors.critical.length : 0;
  const warnCount = errors.warnings ? errors.warnings.length : 0;
  const auditCount = accessFails.length;

  if (critCount === 0 && warnCount === 0 && auditCount === 0) {
    BannerManager.clear();
    return;
  }

  const detailNode = document.createElement("div");
  detailNode.className = "flex flex-col gap-1 mt-2 border-t border-white/10 pt-2";

  function _detailSection(headerText, headerClass, items) {
    const section = document.createElement("div");
    section.className = "mb-2";
    const header = document.createElement("p");
    header.className = `font-bold ${headerClass} mb-1`;
    header.textContent = headerText;
    section.appendChild(header);
    items.forEach((text) => {
      const row = document.createElement("div");
      row.className = "ml-2 text-[10px] opacity-90";
      row.textContent = `• ${text}`;
      section.appendChild(row);
    });
    return section;
  }

  if (critCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Critical Issues:",
        "text-red-400",
        errors.critical.map((e) => `${e.color}/${e.role}: ${e.error}`),
      ),
    );
  if (warnCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Warnings:",
        "text-amber-400",
        errors.warnings.map((w) => `${w.color}/${w.role}: ${w.warning}`),
      ),
    );

  if (auditCount > 0) {
    const section = document.createElement("div");
    const header = document.createElement("p");
    header.className = "font-bold text-blue-400 mb-1";
    header.textContent = "Accessibility Concerns:";
    section.appendChild(header);
    const body = document.createElement("div");
    body.className = "ml-2 text-[10px] opacity-90";
    const shown = accessFails.slice(0, 8);
    shown.forEach((text, i) => {
      if (i > 0) body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(text));
    });
    if (auditCount > 8) {
      body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(`...and ${auditCount - 8} more`));
    }
    section.appendChild(body);
    detailNode.appendChild(section);
  }

  BannerManager.show({
    id: "system-status-banner",
    type: critCount > 0 ? "error" : warnCount > 0 ? "warning" : "info",
    title: critCount > 0 ? "Color System Errors" : "System Audit Results",
    message: `${critCount > 0 ? `${critCount} Critical · ` : ""}${warnCount} Warnings · ${auditCount} Access concerns detected.`,
    detailNode,
    dismissable: true,
  });
}
