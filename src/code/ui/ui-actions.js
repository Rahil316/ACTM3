/**
 * ============================================================================
 * UI ACTIONS & CRUD
 * Handlers for modifying appState and triggering re-renders.
 * ============================================================================
 */

function toggleSection(id, event) {
  if (event && event.target.closest("button")) return;
  const section = document.getElementById(id);
  const isCollapsed = section.classList.toggle("collapsed");
  const trigger = section.querySelector('[role="button"]');
  if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
}

function showSheet(id) {
  document.getElementById(id).classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => s.classList.remove("open"));
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function showOverlay(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideOverlay(id) {
  document.getElementById(id).classList.add("hidden");
  if (id === "success-overlay" || id === "error-overlay") hideSheets();
}

function updateGroup(idx, key, value, el) {
  if (key === "value") {
    const clean = value
      .replace(/[^0-9A-Fa-f]/g, "")
      .toUpperCase()
      .substring(0, 6);
    if (el && el.value !== clean) {
      const start = el.selectionStart;
      el.value = clean;
      el.setSelectionRange(start, start);
    }
    appState.colors[idx].value = clean;
    renderColorGroups();
  } else {
    appState.colors[idx][key] = value;
    if (key === "name") renderColorGroups();
  }
}

function removeGroup(idx) {
  appState.colors.splice(idx, 1);
  renderColorGroups();
  schedulePreview();
}

function moveGroup(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.colors.length) return;
  const [item] = appState.colors.splice(idx, 1);
  appState.colors.splice(target, 0, item);
  renderColorGroups();
}

function addGroup() {
  const n = appState.colors.length + 1;
  appState.colors.unshift({ _id: generateId(), name: `color${n}`, shorthand: `C${n}`, value: "888888" });
  renderColorGroups();
  schedulePreview();
}

function updateRole(idx, key, value) {
  if (key.startsWith("variationTarget:")) {
    const vi = parseInt(key.slice("variationTarget:".length));
    if (!appState.roles[idx].variationTargets) {
      appState.roles[idx].variationTargets = appState.variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5);
    }
    let v = parseFloat(value);
    if (isNaN(v) || v < 1) v = 1;
    appState.roles[idx].variationTargets[vi] = Math.min(21, v);
  } else if (key === "minContrast") {
    let v = parseFloat(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].minContrast = Math.max(1, Math.min(21, v));
  } else if (key === "spread") {
    let v = parseInt(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].spread = Math.max(1, Math.min(21, v));
  } else if (key === "baseIndex" || key === "darkBaseIndex") {
    let v = parseInt(value);
    if (isNaN(v)) v = 0;
    appState.roles[idx][key] = Math.max(0, Math.min(appState.colorSteps - 1, v));
  } else {
    appState.roles[idx][key] = value;
  }
  renderRoles();
}

function removeRole(idx) {
  appState.roles.splice(idx, 1);
  renderRoles();
  schedulePreview();
}

function moveRole(idx, dir) {
  const target = idx + dir;
  if (target < 0 || target >= appState.roles.length) return;
  const [item] = appState.roles.splice(idx, 1);
  appState.roles.splice(target, 0, item);
  renderRoles();
}

function addRole() {
  const n = appState.roles.length + 1;
  const mid = Math.floor(appState.colorSteps / 2);
  appState.roles.unshift({
    _id: generateId(),
    name: "Role " + n,
    shorthand: `r-${n}`,
    spread: 2,
    minContrast: 4.5,
    baseIndex: mid,
    darkBaseIndex: mid,
    variationTargets: appState.variations.map((_, i) => [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5),
    description: "",
    variationOverride: false,
    roleVariations: [],
  });
  renderRoles();
  schedulePreview();
}

// Variation CRUD
function addSharedVariation() {
  ensureVariations();
  const n = appState.variations.length + 1;
  appState.variations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function removeSharedVariation(idx) {
  if (appState.variations.length <= 1) return;
  appState.variations.splice(idx, 1);
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function moveSharedVariation(idx, dir) {
  const arr = appState.variations;
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
  ensureVariations();
  renderSettingsVariations();
  renderRoles();
  schedulePreview();
}

function updateSharedVariation(idx, field, value) {
  if (!appState.variations[idx]) return;
  appState.variations[idx][field] = value;
  renderRoles();
  schedulePreview();
}

function toggleRoleVariationOverride(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = !role.variationOverride;
  if (role.variationOverride) {
    if (!role.roleVariations || role.roleVariations.length === 0) {
      role.roleVariations = appState.variations.map(function (v) {
        return Object.assign({}, v, { _id: generateId() });
      });
    }
  } else {
    role.variationManual = false;
  }
  renderRoles();
  schedulePreview();
}

function toggleRoleVariationManual(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationManual = !role.variationManual;
  renderRoles();
  schedulePreview();
}

function addRoleVariation(roleIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations) role.roleVariations = [];
  const n = role.roleVariations.length + 1;
  role.roleVariations.push({ _id: generateId(), name: String(n), shorthand: String(n) });
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function removeRoleVariation(roleIdx, varIdx) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || role.roleVariations.length <= 1) return;
  role.roleVariations.splice(varIdx, 1);
  ensureVariations();
  renderRoles();
  schedulePreview();
}

function moveRoleVariation(roleIdx, varIdx, dir) {
  const arr = appState.roles[roleIdx].roleVariations;
  if (!arr) return;
  const newIdx = varIdx + dir;
  if (newIdx < 0 || newIdx >= arr.length) return;
  [arr[varIdx], arr[newIdx]] = [arr[newIdx], arr[varIdx]];
  renderRoles();
  schedulePreview();
}

function updateRoleVariation(roleIdx, varIdx, field, value) {
  const role = appState.roles[roleIdx];
  if (!role.roleVariations || !role.roleVariations[varIdx]) return;
  role.roleVariations[varIdx][field] = value;
  schedulePreview();
}

function resetRoleVariationsToShared(roleIdx) {
  const role = appState.roles[roleIdx];
  role.variationOverride = false;
  role.roleVariations = [];
  renderRoles();
  schedulePreview();
}

function updateRoleVariationTargetInline(roleIdx, varIdx, value) {
  if (!appState.roles[roleIdx].variationTargets) {
    const vLen = getRoleVariations(appState.roles[roleIdx], appState).length;
    appState.roles[roleIdx].variationTargets = Array.from({ length: vLen }, (_, i) => (appState.pluginMode === "direct" ? [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5 : Math.floor((appState.colorSteps || 25) / 2)));
  }
  appState.roles[roleIdx].variationTargets[varIdx] = parseFloat(value) || 0;
  schedulePreview();
}

function updateRoleVariationTarget(roleIdx, varIdx, value) {
  if (!appState.roles[roleIdx].variationTargets) {
    const vLen = getRoleVariations(appState.roles[roleIdx], appState).length;
    appState.roles[roleIdx].variationTargets = Array.from({ length: vLen }, (_, i) => (appState.pluginMode === "direct" ? [1.5, 3.0, 4.5, 7.0, 12.0][i] || 4.5 : Math.floor((appState.colorSteps || 25) / 2)));
  }
  appState.roles[roleIdx].variationTargets[varIdx] = parseFloat(value) || 0;
  schedulePreview();
}
