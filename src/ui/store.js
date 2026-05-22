/**
 * ============================================================================
 * Token Wand STATE MANAGEMENT (The Vanilla Store)
 * Single source of truth for all plugin state. Owns:
 *   - Identity helpers (generateId, ensureIds, ensureVariations)
 *   - appState and UI preferences
 *   - Persistence snapshot (savedState) for rename detection
 *   - Dirty-hash tracking (isDirty / markClean)
 *   - Validation (validateState)
 *   - All state mutations (setColor, setRole, setVariation, setRoleVariation)
 * ============================================================================
 */

// ── CONSTANTS ──
const DEFAULT_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

const SOLVER_MODE_OPTIONS = [
  ["natural",          "Balanced"],
  ["saturated",        "Vivid"],
  ["luminance",        "Muted"],
  ["hue-locked",       "Hue Locked"],
  ["chroma-maximized", "Max Chroma"],
];

function defaultVariationTargets(len) {
  return Array.from({ length: len }, (_, i) => DEFAULT_VARIATION_TARGETS[i] || 4.5);
}

function isDirectMode() {
  return appState.pluginMode === "direct";
}

// ── IDENTITY ──
function generateId() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

function ensureIds(state) {
  if (state.colors)
    state.colors.forEach((c) => {
      if (!c._id) c._id = generateId();
    });
  if (state.roles)
    state.roles.forEach((r) => {
      if (!r._id) r._id = generateId();
    });
  if (state.themes)
    state.themes.forEach((t) => {
      if (!t._id) t._id = generateId();
    });
  return state;
}

// ── BOOTSTRAP CONFIG ──
// Minimal safe state used before themeShop.js loads. On first launch
// runtime.js replaces this with PRESETS[0].config (TW Regular).
const _bootstrapConfig = {
  name: "Token Wand",
  description: "",
  versions: [],
  pluginMode: "scale",
  scaleAlgorithm: "Natural",
  scaleLength: 25,
  useUniformAlgorithm: true,
  algorithmScopeLevel: "color",
  solverMode: "natural",
  tokenNameSegments: ["color", "role", "variation"],
  useShorthandColors: false,
  useShorthandRoles: false,
  useShorthandVariations: false,
  useShorthandSteps: false,
  resolveTokensDirectly: false,
  includeSourceColors: false,
  sourceCollectionName: "global",
  includeAlphaTints: false,
  alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
  tokenGrouping: "color",
  includeColorScalesCollection: true,
  includeDescriptions: false,
  scaleCollectionName: "_scale",
  tokenCollectionName: "color tokens",
  scaleStepNames: null,
  variations: null,
  colors: [
    { name: "Primary", shorthand: "pr", value: "0066FF", description: "" },
    { name: "Gray",    shorthand: "gr", value: "6B7280", description: "" },
  ],
  roles: [
    { name: "Text",       shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [3.0, 4.5, 7.0, 10.0, 14.0] },
    { name: "Background", shorthand: "bg", minContrast: 1.1, mappingMethod: "contrast", variationTargets: [1.0, 1.05, 1.1, 1.2, 1.35] },
    { name: "Border",     shorthand: "bd", minContrast: 2.0, mappingMethod: "contrast", variationTargets: [1.5, 2.0, 2.5, 3.0, 3.5] },
  ],
  themes: [
    { name: "Light", bg: "FFFFFF" },
    { name: "Dark",  bg: "0F0F0F" },
  ],
};

ensureIds(_bootstrapConfig);

// ── APP STATE ──
let appState = JSON.parse(JSON.stringify(_bootstrapConfig));
ensureVariations();

// Snapshot of blank state for isDefaultState() — _id fields stripped since they're random per session.
const _blankStateSnap = (() => { const s = JSON.parse(JSON.stringify(appState)); delete s.versions; return JSON.stringify(_stripIds(s)); })();

function _stripIds(obj) {
  if (Array.isArray(obj)) return obj.map(_stripIds);
  if (obj && typeof obj === "object") {
    const out = {};
    for (const k of Object.keys(obj)) { if (k !== "_id") out[k] = _stripIds(obj[k]); }
    return out;
  }
  return obj;
}

const UI_DIMS = {
  defaultWidth: 400,
  defaultHeight: 720,
  minWidth: 400,
  minHeight: 560,
  maxWidth: 1400,
  maxHeight: 1400,
};

let uiPrefs = { scale: 1.0, theme: "dark" };
let activeSidebarTab = "color-groups";
let _colorDragSrcIdx = null;
let _roleDragSrcIdx = null;

// Ensures appState.variations exists and all roles have matching variationTargets arrays.
function ensureVariations() {
  if (!appState.variations || appState.variations.length === 0) {
    const defaults = [
      { name: "Subtle",   shorthand: "1" },
      { name: "Soft",     shorthand: "2" },
      { name: "Default",  shorthand: "3" },
      { name: "Strong",   shorthand: "4" },
      { name: "Bold",     shorthand: "5" },
    ];
    appState.variations = defaults.map((d) => ({ _id: generateId(), name: d.name, shorthand: d.shorthand }));
  }
  for (const role of appState.roles) {
    const roleVars = role.customVariationList && role.customVariations && role.customVariations.length > 0 ? role.customVariations : appState.variations;
    const vLen = roleVars.length;
    if (!role.variationTargets || role.variationTargets.length !== vLen) {
      const oldVals = role.variations ? Object.values(role.variations) : Array.isArray(role.variationTargets) ? role.variationTargets : [];
      role.variationTargets = roleVars.map((_, i) => oldVals[i] || DEFAULT_VARIATION_TARGETS[i] || 4.5);
      delete role.variations;
    }
  }
}

// ── PERSISTENCE SNAPSHOT ──
// Tracks the last appState snapshot that was successfully synced to Figma.
// Used by config.js to build variable rename maps (old name → new name).
let savedState = null;

/**
 * Deep-clones snapshot as the new savedState baseline.
 * Pass null to clear (e.g. after a full reset).
 * @param {object|null} snapshot
 */
function setSavedState(snapshot) {
  savedState = snapshot ? JSON.parse(JSON.stringify(snapshot)) : null;
}

/** @returns {object|null} Last persisted appState snapshot, or null if never synced */
function getSavedState() {
  return savedState;
}

/**
 * Merges incoming config into appState, re-syncs ids/variations,
 * and marks the result clean so isDirty() returns false until the next mutation.
 * Use for imports and load-config — not for partial field updates.
 * @param {object} incoming - Partial or full appState-shaped object
 */
function loadState(incoming) {
  (incoming.roles || []).forEach((r) => {
    if (!r.mappingMethod) r.mappingMethod = "contrast";
  });
  Object.assign(appState, incoming);
  ensureIds(appState);
  ensureVariations();
  markClean();
}

// ── HASH & DIRTY TRACKING ──
// Compares a hash of the config fields that affect engine output.
// isDirty() returns true whenever appState has changed since the last successful sync.
let _stateHash = null;

function _computeHash() {
  const s = appState;
  return JSON.stringify({
    colors: s.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: normalizeHex(c.value || ""), _id: c._id })),
    roles: s.roles,
    themes: s.themes,
    variations: s.variations,
    scaleLength: s.scaleLength,
    scaleAlgorithm: s.scaleAlgorithm,
    pluginMode: s.pluginMode,
    scaleStepNames: s.scaleStepNames,
    useShorthandColors: s.useShorthandColors,
    useShorthandRoles: s.useShorthandRoles,
    useShorthandVariations: s.useShorthandVariations,
    useShorthandSteps: s.useShorthandSteps,
    tokenNameSegments: s.tokenNameSegments,
    resolveTokensDirectly: s.resolveTokensDirectly,
  });
}

/**
 * Returns true if appState has changed since the last markClean() call.
 * @returns {boolean}
 */
function isDirty() {
  return _computeHash() !== _stateHash;
}

/** Records the current appState hash as the clean baseline. */
function markClean() {
  _stateHash = _computeHash();
}

// ── SEGMENT NORMALIZATION ──
/**
 * Normalizes a slash-delimited Figma variable path segment string.
 * Trims whitespace from each part, collapses consecutive slashes, and
 * strips any leading or trailing slash. Intentional nesting ("Brand/Primary")
 * is preserved — only malformed structure is cleaned.
 * @param {string} str
 * @returns {string}
 */
function normalizeSegment(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");
}

/**
 * Returns the number of slash-separated segments in a name.
 * "Brand/Primary" → 2, "Text" → 1.
 * @param {string} str
 * @returns {number}
 */
function segmentDepth(str) {
  if (!str || typeof str !== "string") return 1;
  return str.split("/").filter(Boolean).length;
}

// ── PROJECT DESCRIPTION ──
function updateProjectDescription(value) {
  appState.description = value;
}

// ── VERSIONS ──
function _relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

// Returns a stable JSON snapshot of appState without versions, used for all
// "has anything changed?" comparisons. Single source of truth — BUG-9/BUG-12.
function _snapWithoutVersions() {
  const snap = JSON.parse(JSON.stringify(appState));
  delete snap.versions;
  return snap;
}

function lastSavedVersion() {
  const versions = appState.versions || [];
  if (versions.length === 0) return null;
  const snap = _snapWithoutVersions();
  const lastSnap = JSON.parse(JSON.stringify(versions[0].state));
  return JSON.stringify(snap) === JSON.stringify(lastSnap) ? versions[0] : null;
}

function isDefaultState() {
  return JSON.stringify(_stripIds(_snapWithoutVersions())) === _blankStateSnap;
}

/** Returns why saving a version is blocked, or null if saving is allowed. */
function versionSaveBlockedReason() {
  const versions = appState.versions || [];
  const snap = _snapWithoutVersions();
  const snapStr = JSON.stringify(snap);
  if (JSON.stringify(_stripIds(snap)) === _blankStateSnap) {
    return "Nothing to save! Still at square one.";
  }
  if (versions.length > 0 && snapStr === JSON.stringify(versions[0].state)) {
    return `No changes since "${versions[0].name}" (${_relativeTime(versions[0].createdAt)})`;
  }
  return null;
}

function _persistState() {
  parent.postMessage({ pluginMessage: { type: "save-config", state: appState } }, "*");
}

function saveVersion(name, description) {
  if (!name || !name.trim()) {
    BannerManager.warn("Please give this version a name.", { autoClose: 3000 });
    return false;
  }
  const reason = versionSaveBlockedReason();
  if (reason) {
    BannerManager.warn(reason, { autoClose: 3000 });
    return false;
  }
  const snap = JSON.parse(JSON.stringify(appState));
  delete snap.versions;
  appState.versions = appState.versions || [];
  appState.versions.unshift({ _id: generateId(), name: name.trim(), description, createdAt: Date.now(), state: snap });
  _persistState();
  return true;
}

function restoreVersion(id) {
  const v = (appState.versions || []).find((v) => v._id === id);
  if (!v) return;
  const savedVersions = appState.versions;
  try {
    loadState(JSON.parse(JSON.stringify(v.state)));
  } catch (e) {
    BannerManager.warn("Failed to restore version.", { autoClose: 3000 });
    return;
  }
  appState.versions = savedVersions;
  _persistState();
}

function deleteVersion(id) {
  appState.versions = (appState.versions || []).filter((v) => v._id !== id);
  _persistState();
}

// ── VALIDATION ──
/**
 * Checks appState for problems that would prevent a successful Figma sync.
 * @returns {string|null} Human-readable error message, or null if valid
 */
/**
 * Validates appState for problems that would corrupt a Figma sync.
 * Returns null when clean, or an array of issue strings when problems exist.
 * Hard blockers (no colors / no roles) return a single-item array and stop
 * early — the rest of the checks assume at least one of each exists.
 */
function validateState() {
  if (!appState.colors || appState.colors.length === 0) return ["Add at least one color before running."];
  if (!appState.roles  || appState.roles.length  === 0) return ["Add at least one role before running."];

  const issues = [];
  const hasDup = (arr) => new Set(arr).size !== arr.length;
  const activeVariations = appState.variations && appState.variations.length > 0 ? appState.variations : [];

  // ── Empty names ──
  if (appState.colors.some((c) => !c.name || !c.name.trim()))
    issues.push("One or more colors has an empty name.");
  if (appState.roles.some((r) => !r.name || !r.name.trim()))
    issues.push("One or more roles has an empty name.");
  if (activeVariations.some((v) => !v.name || !v.name.trim()))
    issues.push("One or more variations has an empty name.");

  // ── Shorthand depth must match name depth ──
  for (const c of appState.colors) {
    if (c.shorthand && segmentDepth(c.shorthand) !== segmentDepth(c.name))
      issues.push(`Color "${c.name}": shorthand "${c.shorthand}" has ${segmentDepth(c.shorthand)} segment(s) but the name has ${segmentDepth(c.name)}. They must match to keep the Figma folder structure consistent (e.g. "Brand/Primary" → "br/pr").`);
  }
  for (const r of appState.roles) {
    if (r.shorthand && segmentDepth(r.shorthand) !== segmentDepth(r.name))
      issues.push(`Role "${r.name}": shorthand "${r.shorthand}" has ${segmentDepth(r.shorthand)} segment(s) but the name has ${segmentDepth(r.name)}. They must match to keep the Figma folder structure consistent.`);
  }
  for (const v of activeVariations) {
    if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name))
      issues.push(`Variation "${v.name}": shorthand "${v.shorthand}" has ${segmentDepth(v.shorthand)} segment(s) but the name has ${segmentDepth(v.name)}. They must match to keep the Figma folder structure consistent.`);
  }
  for (const r of appState.roles) {
    if (!r.customVariationList || !r.customVariations) continue;
    for (const v of r.customVariations) {
      if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name))
        issues.push(`Variation "${v.name}" (role "${r.name}"): shorthand "${v.shorthand}" has ${segmentDepth(v.shorthand)} segment(s) but the name has ${segmentDepth(v.name)}. They must match to keep the Figma folder structure consistent.`);
    }
  }

  // ── Resolved label collisions ──
  // Build the label each entity will actually produce in Figma (name or shorthand
  // depending on the current toggle) and flag any that clash within their type.
  const resolvedColorLabels = appState.colors.map((c) =>
    (appState.useShorthandColors && c.shorthand ? c.shorthand : c.name).toLowerCase()
  );
  if (hasDup(resolvedColorLabels))
    issues.push("Two or more colors resolve to the same Figma path with the current shorthand setting. Variables will be silently merged in Figma.");

  const resolvedRoleLabels = appState.roles.map((r) =>
    (appState.useShorthandRoles && r.shorthand ? r.shorthand : r.name).toLowerCase()
  );
  if (hasDup(resolvedRoleLabels))
    issues.push("Two or more roles resolve to the same Figma path with the current shorthand setting. Variables will be silently merged in Figma.");

  const resolvedVariationLabels = activeVariations.map((v) =>
    (appState.useShorthandVariations && v.shorthand ? v.shorthand : v.name).toLowerCase()
  );
  if (hasDup(resolvedVariationLabels))
    issues.push("Two or more variations resolve to the same Figma path with the current shorthand setting. Variables will be silently merged in Figma.");

  // ── Raw name / shorthand uniqueness ──
  const colorNames  = appState.colors.map((c) => c.name.trim().toLowerCase());
  const colorShorts = appState.colors.map((c) => (c.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const roleNames   = appState.roles.map((r) => r.name.trim().toLowerCase());
  const roleShorts  = appState.roles.map((r) => (r.shorthand || "").trim().toLowerCase()).filter(Boolean);

  if (hasDup(colorNames))  issues.push("Two or more colors share the same name.");
  if (colorShorts.length && hasDup(colorShorts)) issues.push("Two or more colors share the same shorthand.");
  if (hasDup(roleNames))   issues.push("Two or more roles share the same name.");
  if (roleShorts.length && hasDup(roleShorts))   issues.push("Two or more roles share the same shorthand.");

  return issues.length > 0 ? issues : null;
}

// ── MUTATIONS: COLORS ──
/**
 * Sets a field on appState.colors[idx]. Sanitizes hex when key === "value".
 * @param {number} idx
 * @param {string} key   - e.g. "name", "value", "shorthand", "description"
 * @param {string} value
 */
function setColor(idx, key, value) {
  if (!appState.colors[idx]) return;
  if (key === "value") value = sanitizeHex(value);
  if (key === "name" || key === "shorthand") value = normalizeSegment(value);
  appState.colors[idx][key] = value;
}

// ── MUTATIONS: ROLES ──
/**
 * Sets a field on appState.roles[idx] with appropriate clamping/validation.
 * The composite key "variationTarget:N" sets roles[idx].variationTargets[N].
 * @param {number} idx
 * @param {string} key   - Field name or "variationTarget:N"
 * @param {*}      value
 */
function setRole(idx, key, value) {
  if (!appState.roles[idx]) return;
  if (key.startsWith("variationTarget:")) {
    const vi = parseInt(key.slice("variationTarget:".length), 10);
    if (!appState.roles[idx].variationTargets) appState.roles[idx].variationTargets = defaultVariationTargets(appState.variations.length);
    const isIndex = appState.roles[idx].mappingMethod === "index";
    if (isIndex) {
      let v = parseInt(value);
      if (isNaN(v) || v < 0) v = 0;
      appState.roles[idx].variationTargets[vi] = Math.min(appState.scaleLength - 1, v);
    } else {
      let v = parseFloat(value);
      if (isNaN(v) || v < 1) v = 1;
      appState.roles[idx].variationTargets[vi] = Math.min(21, v);
    }
    return;
  }
  if (key === "minContrast") {
    let v = parseFloat(value);
    if (isNaN(v)) v = 1;
    appState.roles[idx].minContrast = Math.max(1, Math.min(21, v));
    return;
  }
  if (key === "mappingMethod") {
    appState.roles[idx].mappingMethod = value === "index" ? "index" : "contrast";
    return;
  }
  if (key === "name" || key === "shorthand") value = normalizeSegment(value);
  appState.roles[idx][key] = value;
}

/**
 * Sets a field on a per-role variation entry.
 * @param {number} roleIdx
 * @param {number} varIdx
 * @param {string} field
 * @param {*}      value
 */
function setRoleVariation(roleIdx, varIdx, field, value) {
  const role = appState.roles[roleIdx];
  if (!role || !role.customVariations) return;
  if (varIdx < 0 || varIdx >= role.customVariations.length) return;
  if (field === "name" || field === "shorthand") value = normalizeSegment(value);
  role.customVariations[varIdx][field] = value;
}

// ── MUTATIONS: VARIATIONS ──
/**
 * Sets a field on appState.variations[idx].
 * @param {number} idx
 * @param {string} field
 * @param {*}      value
 */
function setVariation(idx, field, value) {
  if (!appState.variations[idx]) return;
  if (field === "name" || field === "shorthand") value = normalizeSegment(value);
  appState.variations[idx][field] = value;
}

