/**
 * ============================================================================
 * UI I/O & DATA MANAGEMENT
 * Logic for importing/exporting JSON and syncing with Figma.
 * ============================================================================
 */

function validateUniqueness() {
  const colorNames = appState.colors.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
  const colorShorts = appState.colors.map((c) => (c.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const roleNames = appState.roles.map((r) => r.name.trim().toLowerCase()).filter(Boolean);
  const roleShorts = appState.roles.map((r) => (r.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const hasDup = (arr) => new Set(arr).size !== arr.length;
  if (hasDup(colorNames)) return "Two or more color groups share the same name. Each color name must be unique.";
  if (colorShorts.length && hasDup(colorShorts)) return "Two or more color groups share the same short name. Each color short name must be unique.";
  if (hasDup(roleNames)) return "Two or more roles share the same name. Each role name must be unique.";
  if (roleShorts.length && hasDup(roleShorts)) return "Two or more roles share the same short name. Each role short name must be unique.";
  return null;
}

function handleSubmit(scope = "all") {
  const dupError = validateUniqueness();
  if (dupError) {
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = dupError;
    return;
  }
  pendingScope = scope;
  parent.postMessage(
    {
      pluginMessage: {
        type: "check-collections",
        colorName: appState.tonalScaleCollectionName || "_scale",
        contextualName: appState.tokenCollectionName || "contextual",
        state: appState,
        savedState: savedState,
      },
    },
    "*",
  );
}

function proceedWithSync() {
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creater", state: appState, scope: pendingScope, savedState: savedState } }, "*");
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
  const colorName = appState.tonalScaleCollectionName || "_scale";
  const ctxName = appState.tokenCollectionName || "contextual";
  const isDirect = appState.pluginMode === "direct";
  const skipRamps = appState.embedDirectly || isDirect;
  const tg = appState.variableStructure || "color";
  const shortC = appState.useShorthandColors;
  const shortR = appState.useShorthandRoles;
  const scope = pendingScope || "all";

  // Sync all toggle states (settings sheet + run dialog)
  syncOutputToggles();

  // Hide scope selector and skip-ramps toggle in Direct Contrast mode
  const scopeSection = document.getElementById("rd-scope-section");
  if (scopeSection) scopeSection.classList.toggle("hidden", isDirect);
  const skipRampsRow = document.getElementById("rd-skip-ramps-row");
  if (skipRampsRow) skipRampsRow.classList.toggle("hidden", isDirect);

  // Collections
  const colsEl = document.getElementById("rd-collections");
  if (colsEl) {
    const rows = [];
    if (!skipRamps && scope !== "roles") {
      const rampsExists = existing.includes(colorName);
      rows.push(collectionRow(colorName, rampsExists ? "UPDATE" : "CREATE", rampsExists));
    }
    if (scope !== "groups") {
      const ctxExists = existing.includes(ctxName);
      rows.push(collectionRow(ctxName, ctxExists ? "UPDATE" : "CREATE", ctxExists));
    }
    if (appState.includeGlobalColors) {
      const constName = appState.globalColorsCollectionName || "_constants";
      const constExists = existing.includes(constName);
      rows.push(collectionRow(constName, constExists ? "UPDATE" : "CREATE", constExists));
    }
    colsEl.innerHTML = rows.length ? rows.join("") : `<p class="text-[12px] text-[var(--text-muted)] px-1">No collections will be modified for this scope.</p>`;
  }

  // Name preview
  const sampleColor = appState.colors[0] || { name: "Primary", shorthand: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shorthand: "tx" };
  const cLabel = shortC ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const stepLabel = appState.variations && appState.variations[2] ? (appState.useShorthandVariations && appState.variations[2].shorthand ? appState.variations[2].shorthand : appState.variations[2].name) : "3";
  const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("rd-name-preview");
  if (previewEl) previewEl.textContent = exName;

  // Renames section
  const renameEl = document.getElementById("rd-renames");
  const renameListEl = document.getElementById("rd-renames-list");
  if (renameEl && renameListEl) {
    const summary = lastRenameData && lastRenameData.summary;
    const rampCount = isDirect ? 0 : (summary && summary.rampCount) || 0;
    const ctxCount = (summary && summary.contextualCount) || 0;
    const changes = ((summary && summary.changes) || []).filter((ch) => (isDirect ? ch.type !== "stepNames" : true));
    const totalRenames = rampCount + ctxCount;

    if (totalRenames > 0 && changes.length > 0) {
      renameEl.classList.remove("hidden");
      const typeLabels = { color: "Color", role: "Role", stepNames: "Scale Steps", roleStepNames: "Variation Levels", grouping: "Grouping" };
      let html = "";
      for (const ch of changes) {
        const label = typeLabels[ch.type] || ch.type;
        html += `<div class="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0">
                <span class="text-[11px] text-[var(--text-muted)] w-[68px] shrink-0">${label}</span>
                <span class="text-[11px] font-mono text-[var(--text-primary)] truncate flex-1">${ch.from}</span>
                <span class="text-[11px] text-[var(--accent)] shrink-0 px-0.5">→</span>
                <span class="text-[11px] font-mono text-[var(--accent)] truncate flex-1">${ch.to}</span>
              </div>`;
      }
      html += `<div class="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0"></span>
              <span>${[rampCount > 0 ? `${rampCount} scale var${rampCount > 1 ? "s" : ""}` : "", ctxCount > 0 ? `${ctxCount} token var${ctxCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ")} will be renamed</span>
            </div>`;
      renameListEl.innerHTML = html;
    } else {
      renameEl.classList.add("hidden");
    }
  }

  // Summary
  const sumEl = document.getElementById("rd-summary");
  if (sumEl) {
    const colorList = appState.colors.map((c) => `${c.name}${c.shorthand ? ` (${c.shorthand})` : ""}`).join(", ");
    const roleList = appState.roles.map((r) => `${r.name}${r.shorthand ? ` (${r.shorthand})` : ""}`).join(", ");
    sumEl.innerHTML = [
      summaryRow("Project Name", appState.name || "—"),
      summaryRow(`Colors x${appState.colors.length}`, `${colorList}`),
      summaryRow(`Roles x${appState.roles.length}`, `${roleList}`),
      summaryRow("Mode", appState.pluginMode === "direct" ? "Adaptive Engine" : "Palette-Based"),
      ...(appState.pluginMode === "direct"
        ? []
        : [
            summaryRow("Base Selection", appState.baseSelection || "By Contrast"),
            ...(appState.baseSelection !== "Manual" ? [summaryRow("Spread Unit", (appState.spreadUnit || "steps") === "contrast" ? "Contrast Gap" : "Steps")] : []),
            summaryRow("Color Steps", String(appState.colorSteps || 25)),
            summaryRow("Scale Algorithm", appState.scaleAlgorithm || "Natural"),
          ]),
    ].join("");
  }

  // Warnings
  const warnEl = document.getElementById("rd-warnings");
  if (warnEl) {
    const relevant = existing.filter((n) => (n === colorName && !skipRamps && scope !== "roles") || (n === ctxName && scope !== "groups"));
    if (relevant.length > 0) {
      warnEl.classList.remove("hidden");
      document.getElementById("rd-warning-text").textContent = `${relevant.map((n) => `"${n}"`).join(" and ")} already exist. Variables will be added or updated — nothing deleted.`;
    } else {
      warnEl.classList.add("hidden");
    }
  }

  function collectionRow(name, label, isExisting) {
    return `<div class="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2">
            <span class="text-[13px] text-[var(--text-primary)] font-mono">${name}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}">${label}</span>
          </div>`;
  }

  function summaryRow(label, value) {
    return `<div class="flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0">
            <span class="text-[var(--text-muted)] shrink-0">${label}</span>
            <span class="text-[var(--text-primary)] text-right text-[11px]">${value}</span>
          </div>`;
  }
}

let _pendingImportData = null;
function handleImportJSON(json) {
  try {
    const imported = typeof json === "string" ? JSON.parse(json) : json;
    if (!imported.colors || !imported.roles) throw new Error("Invalid config format");
    
    _pendingImportData = imported;
    showOverlay("confirm-import-overlay");
    
    document.getElementById("btn-import-save").onclick = () => {
      exportConfig();
      finalizeImport();
    };
    document.getElementById("btn-import-now").onclick = () => {
      finalizeImport();
    };
  } catch (err) {
    BannerManager.error("Import failed: " + err.message);
  }
}

function finalizeImport() {
  if (!_pendingImportData) return;
  Object.assign(appState, _pendingImportData);
  _pendingImportData = null;
  hideOverlay("confirm-import-overlay");
  ensureVariations();
  syncInputsFromState();
  renderColorGroups();
  renderRoles();
  BannerManager.success("Config imported successfully");
}


function exportConfig() {
  const data = JSON.stringify(appState, null, 2);
  triggerDownload(data, exportFileName("config", "json"), "application/json");
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

function showSystemBanners(errors, result = null) {
  if (!errors) return;

  const accessFails = [];
  if (result && result.colorTokens) {
    for (const mode of ["light", "dark"]) {
      const modeTokens = result.colorTokens[mode];
      if (!modeTokens) continue;
      for (const clrName in modeTokens) {
        for (const roleId in modeTokens[clrName]) {
          const roleTokens = modeTokens[clrName][roleId];
          for (const varKey in roleTokens) {
            const tkn = roleTokens[varKey];
            if (tkn.contrast && tkn.contrast.rating === "Fail") {
              accessFails.push(`<b>${clrName}/${tkn.role}</b> (${mode})`);
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

  let detailHtml = "";
  if (critCount > 0) {
    detailHtml += `<div class="mb-2"><p class="font-bold text-red-400 mb-1">Critical Issues:</p>`;
    errors.critical.forEach((e) => {
      detailHtml += `<div class="ml-2 text-[10px] opacity-90">• <b>${e.color}/${e.role}</b>: ${e.error}</div>`;
    });
    detailHtml += `</div>`;
  }
  if (warnCount > 0) {
    detailHtml += `<div class="mb-2"><p class="font-bold text-amber-400 mb-1">Warnings:</p>`;
    errors.warnings.forEach((w) => {
      detailHtml += `<div class="ml-2 text-[10px] opacity-90">• <b>${w.color}/${w.role}</b>: ${w.warning}</div>`;
    });
    detailHtml += `</div>`;
  }
  if (auditCount > 0) {
    detailHtml += `<div><p class="font-bold text-blue-400 mb-1">Accessibility Concerns:</p>`;
    detailHtml += `<div class="ml-2 text-[10px] opacity-90">${accessFails.slice(0, 8).join("<br>")}${auditCount > 8 ? `<br>...and ${auditCount - 8} more` : ""}</div>`;
    detailHtml += `</div>`;
  }

  BannerManager.show({
    id: "system-status-banner",
    type: critCount > 0 ? "error" : warnCount > 0 ? "warning" : "info",
    title: critCount > 0 ? "Color System Errors" : "System Audit Results",
    message: `${critCount > 0 ? `${critCount} Critical · ` : ""}${warnCount} Warnings · ${auditCount} Access concerns detected.`,
    detail: `<div class="flex flex-col gap-1 mt-2 border-t border-white/10 pt-2">${detailHtml}</div>`,
    dismissable: true,
  });
}
