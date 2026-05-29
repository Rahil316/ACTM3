import { create } from "zustand";
import type { AppState, Color, Role, Theme, Variation, ValidationIssues, MappingMethod } from "../types/state";

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

export const SOLVER_MODE_OPTIONS: [string, string][] = [
  ["natural", "Balanced"],
  ["saturated", "Vivid"],
  ["luminance", "Muted"],
  ["hue-locked", "Hue Locked"],
  ["chroma-maximized", "Max Chroma"],
];

export const SCALE_ALGORITHM_OPTIONS = ["Natural", "Uniform", "Linear", "Expressive", "Symmetric", "OKLCH", "Material"] as const;

export const UI_DIMS = {
  defaultWidth: 560,
  defaultHeight: 720,
  minWidth: 560,
  minHeight: 520,
  maxWidth: 1400,
  maxHeight: 1400,
};

// ── Preset pools (mirrors vanilla crud.js) ───────────────────────────────────

const PRESET_COLORS = [
  { name: "Crimson",    shorthand: "cr", value: "#DC143C" },
  { name: "Coral",      shorthand: "co", value: "#FF6B6B" },
  { name: "Tomato",     shorthand: "to", value: "#FF4500" },
  { name: "Orange",     shorthand: "or", value: "#FF7F00" },
  { name: "Amber",      shorthand: "am", value: "#F59E0B" },
  { name: "Gold",       shorthand: "gd", value: "#FFD700" },
  { name: "Lime",       shorthand: "li", value: "#84CC16" },
  { name: "Emerald",    shorthand: "em", value: "#10B981" },
  { name: "Teal",       shorthand: "te", value: "#14B8A6" },
  { name: "Cyan",       shorthand: "cy", value: "#06B6D4" },
  { name: "Sky",        shorthand: "sk", value: "#0EA5E9" },
  { name: "Blue",       shorthand: "bl", value: "#3B82F6" },
  { name: "Cobalt",     shorthand: "cb", value: "#0047AB" },
  { name: "Indigo",     shorthand: "in", value: "#6366F1" },
  { name: "Violet",     shorthand: "vi", value: "#7C3AED" },
  { name: "Purple",     shorthand: "pu", value: "#A855F7" },
  { name: "Fuchsia",    shorthand: "fu", value: "#D946EF" },
  { name: "Pink",       shorthand: "pk", value: "#EC4899" },
  { name: "Rose",       shorthand: "ro", value: "#F43F5E" },
  { name: "Brown",      shorthand: "br", value: "#92400E" },
  { name: "Sienna",     shorthand: "si", value: "#A0522D" },
  { name: "Sand",       shorthand: "sa", value: "#C2B280" },
  { name: "Slate",      shorthand: "sl", value: "#64748B" },
  { name: "Stone",      shorthand: "st", value: "#78716C" },
  { name: "Zinc",       shorthand: "zn", value: "#71717A" },
  { name: "Gray",       shorthand: "gr", value: "#6B7280" },
  { name: "Neutral",    shorthand: "nt", value: "#737373" },
  { name: "Charcoal",   shorthand: "ch", value: "#374151" },
  { name: "Navy",       shorthand: "nv", value: "#1E3A5F" },
  { name: "Forest",     shorthand: "fo", value: "#166534" },
  { name: "Olive",      shorthand: "ol", value: "#6B7C2C" },
  { name: "Mint",       shorthand: "mn", value: "#A7F3D0" },
  { name: "Lavender",   shorthand: "lv", value: "#C4B5FD" },
  { name: "Peach",      shorthand: "pe", value: "#FBBF9C" },
  { name: "Midnight",   shorthand: "md", value: "#121212" },
  { name: "Magenta",    shorthand: "mg", value: "#FF00FF" },
  { name: "Turquoise",  shorthand: "tu", value: "#40E0D0" },
  { name: "Maroon",     shorthand: "mr", value: "#800000" },
  { name: "Burgundy",   shorthand: "bu", value: "#800020" },
  { name: "Scarlet",    shorthand: "sc", value: "#FF2400" },
  { name: "Tangerine",  shorthand: "tg", value: "#F28500" },
];

const PRESET_ROLES = [
  { name: "Text",        shorthand: "tx" },
  { name: "Fill",        shorthand: "fi" },
  { name: "Background",  shorthand: "bg" },
  { name: "Border",      shorthand: "bd" },
  { name: "Icon",        shorthand: "ic" },
  { name: "Surface",     shorthand: "su" },
  { name: "Overlay",     shorthand: "ov" },
  { name: "Accent",      shorthand: "ac" },
  { name: "Muted",       shorthand: "mu" },
  { name: "Subtle",      shorthand: "sb" },
  { name: "Emphasis",    shorthand: "em" },
  { name: "Link",        shorthand: "lk" },
  { name: "Placeholder", shorthand: "ph" },
  { name: "Disabled",    shorthand: "ds" },
  { name: "Success",     shorthand: "ok" },
  { name: "Warning",     shorthand: "wn" },
  { name: "Error",       shorthand: "er" },
  { name: "Info",        shorthand: "nf" },
  { name: "Inverse",     shorthand: "iv" },
];

function pickPreset<T extends { name: string; shorthand: string }>(
  pool: T[],
  existing: { name: string; shorthand?: string }[],
  fallback: (n: number) => T,
): T {
  const usedNames = new Set(existing.map((x) => x.name.toLowerCase()));
  const usedShorthands = new Set(existing.map((x) => (x.shorthand ?? '').toLowerCase()));
  const available = pool.filter(
    (p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase()),
  );
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  return fallback(existing.length + 1);
}

// ── Identity helpers ─────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function ensureIds<T extends Partial<AppState>>(state: T): T {
  state.colors?.forEach((c) => {
    if (!c._id) c._id = generateId();
  });
  state.roles?.forEach((r) => {
    if (!r._id) r._id = generateId();
  });
  state.themes?.forEach((t) => {
    if (!t._id) t._id = generateId();
  });
  return state;
}

// ── Segment helpers ──────────────────────────────────────────────────────────

export function normalizeSegment(str: string): string {
  if (!str || typeof str !== "string") return str;
  return str
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");
}

export function deriveShorthand(name: string): string {
  if (!name) return '';
  const words = name.trim().split(/[\s_\-/]+/).filter(Boolean);
  if (words.length >= 2) {
    // Multi-word: initials, up to 4 chars
    return words.map((w) => w[0]).join('').toLowerCase().slice(0, 4);
  }
  // Single word: first consonant + next consonant, else first 2 chars
  const w = words[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (w.length <= 2) return w;
  // Keep first char always, then find first consonant after it
  const rest = w.slice(1).split('').filter((c) => /[bcdfghjklmnpqrstvwxyz]/.test(c));
  if (rest.length >= 1) return w[0] + rest[0];
  return w.slice(0, 2);
}

// Returns the new name for an item when grouping selected items together.
// Finds the common group prefix of all selected names, then nests a new
// "Untitled" subgroup within that prefix so items stay inside their parent group.
// e.g. selected = ["Brand/Primary", "Brand/Accent"] → "Brand/Untitled/Primary"
//      selected = ["Primary", "Accent"]              → "Untitled/Primary"
export function groupedName(itemName: string, selectedNames: string[]): string {
  const segs = selectedNames.map((n) => n.split('/').slice(0, -1));
  // Find longest common prefix across all selected items' group paths
  const minLen = Math.min(...segs.map((s) => s.length));
  const common: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const seg = segs[0][i];
    if (segs.every((s) => s[i] === seg)) common.push(seg);
    else break;
  }
  const leaf = itemName.split('/').pop()!;
  return common.length > 0
    ? `${common.join('/')}/Untitled/${leaf}`
    : `Untitled/${leaf}`;
}

export function segmentDepth(str: string): number {
  if (!str || typeof str !== "string") return 1;
  return str.split("/").filter(Boolean).length;
}

// When a name gains or loses group segments (e.g. "Brand/Primary" vs "Primary"),
// keep the shorthand in sync by deriving a shorthand for each group prefix segment
// while preserving the leaf shorthand the user may have set.
export function syncShorthandToName(name: string, shorthand: string): string {
  const nameSegs = name.split('/').filter(Boolean);
  const shortSegs = shorthand ? shorthand.split('/').filter(Boolean) : [];
  if (nameSegs.length === shortSegs.length) return shorthand; // already in sync
  const leafShort = shortSegs.length > 0 ? shortSegs[shortSegs.length - 1] : deriveShorthand(nameSegs[nameSegs.length - 1]);
  const prefixShorts = nameSegs.slice(0, -1).map((seg) => deriveShorthand(seg));
  return [...prefixShorts, leafShort].join('/');
}

// ── Hex helpers (kept here to avoid circular imports with color engine) ──────

function sanitizeHex(value: string): string {
  return value.replace(/[^0-9a-fA-F#]/g, "").slice(0, 7);
}

function normalizeHex(value: string): string {
  const clean = value.replace(/^#/, "");
  if (clean.length === 3) {
    return (
      "#" +
      clean
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return "#" + clean.padEnd(6, "0").slice(0, 6);
}

// ── Bootstrap config ─────────────────────────────────────────────────────────

const DEFAULT_VARIATIONS: Omit<Variation, "_id">[] = [
  { name: "Subtle", shorthand: "1" },
  { name: "Soft", shorthand: "2" },
  { name: "Default", shorthand: "3" },
  { name: "Strong", shorthand: "4" },
  { name: "Bold", shorthand: "5" },
];

export function makeBootstrapState(): AppState {
  const variations: Variation[] = DEFAULT_VARIATIONS.map((d) => ({
    ...d,
    _id: generateId(),
  }));

  const state: AppState = {
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
    includeSourceColors: false,
    sourceCollectionName: "_constants",
    alphaValues: "",
    tokenGrouping: "color",
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    scaleStepNames: null,
    variations,
    perRoleVariationOverride: false,
    colors: [
      { _id: generateId(), name: "Primary", shorthand: "pr", value: "#0066FF", description: "" },
      { _id: generateId(), name: "Gray", shorthand: "gr", value: "#6B7280", description: "" },
    ],
    roles: [
      { _id: generateId(), name: "Text", shorthand: "tx", minContrast: 4.5, mappingMethod: "contrast", variationTargets: [3.0, 4.5, 7.0, 10.0, 14.0], customVariationList: false, customVariations: [] },
      { _id: generateId(), name: "Background", shorthand: "bg", minContrast: 1.1, mappingMethod: "contrast", variationTargets: [1.0, 1.05, 1.1, 1.2, 1.35], customVariationList: false, customVariations: [] },
      { _id: generateId(), name: "Border", shorthand: "bd", minContrast: 2.0, mappingMethod: "contrast", variationTargets: [1.5, 2.0, 2.5, 3.0, 3.5], customVariationList: false, customVariations: [] },
    ],
    themes: [
      { _id: generateId(), name: "Light", bg: "#FFFFFF" },
      { _id: generateId(), name: "Dark", bg: "#0F0F0F" },
    ],
  };

  return state;
}

// ── ensureVariations ─────────────────────────────────────────────────────────

export function ensureVariations(state: AppState): void {
  if (!state.variations || state.variations.length === 0) {
    state.variations = DEFAULT_VARIATIONS.map((d) => ({ ...d, _id: generateId() }));
  }
  for (const role of state.roles) {
    const roleVars = role.customVariationList && role.customVariations?.length ? role.customVariations : state.variations!;
    const vLen = roleVars.length;
    if (!role.variationTargets || role.variationTargets.length !== vLen) {
      const oldVals = Array.isArray(role.variationTargets) ? role.variationTargets : [];
      role.variationTargets = roleVars.map((_, i) => oldVals[i] ?? DEFAULT_VARIATION_TARGETS[i] ?? 4.5);
    }
  }
}

// ── Dirty hash ───────────────────────────────────────────────────────────────

export function computeHash(state: AppState): string {
  return JSON.stringify({
    colors: state.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: normalizeHex(c.value || ""), _id: c._id })),
    roles: state.roles,
    themes: state.themes,
    variations: state.variations,
    scaleLength: state.scaleLength,
    scaleAlgorithm: state.scaleAlgorithm,
    pluginMode: state.pluginMode,
    scaleStepNames: state.scaleStepNames,
    useShorthandColors: state.useShorthandColors,
    useShorthandRoles: state.useShorthandRoles,
    useShorthandVariations: state.useShorthandVariations,
    useShorthandSteps: state.useShorthandSteps,
    tokenNameSegments: state.tokenNameSegments,
  });
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateState(state: AppState): ValidationIssues {
  if (!state.colors || state.colors.length === 0) return ["Add at least one color before running."];
  if (!state.roles || state.roles.length === 0) return ["Add at least one role before running."];

  const issues: string[] = [];
  const hasDup = (arr: string[]) => new Set(arr).size !== arr.length;
  const activeVariations = state.variations ?? [];

  if (state.colors.some((c) => !c.name?.trim())) issues.push("One or more colors has an empty name.");
  if (state.roles.some((r) => !r.name?.trim())) issues.push("One or more roles has an empty name.");
  if (activeVariations.some((v) => !v.name?.trim())) issues.push("One or more variations has an empty name.");

  for (const c of state.colors) {
    if (c.shorthand && segmentDepth(c.shorthand) !== segmentDepth(c.name)) issues.push(`Color "${c.name}": shorthand segments must match name segments.`);
  }
  for (const r of state.roles) {
    if (r.shorthand && segmentDepth(r.shorthand) !== segmentDepth(r.name)) issues.push(`Role "${r.name}": shorthand segments must match name segments.`);
  }
  for (const v of activeVariations) {
    if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name)) issues.push(`Variation "${v.name}": shorthand segments must match name segments.`);
  }
  for (const r of state.roles) {
    if (!r.customVariationList || !r.customVariations) continue;
    for (const v of r.customVariations) {
      if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name)) issues.push(`Variation "${v.name}" (role "${r.name}"): shorthand segments must match name segments.`);
    }
  }

  const resolvedColorLabels = state.colors.map((c) => (state.useShorthandColors && c.shorthand ? c.shorthand : c.name).toLowerCase());
  if (hasDup(resolvedColorLabels)) issues.push("Two or more colors resolve to the same Figma path.");

  const resolvedRoleLabels = state.roles.map((r) => (state.useShorthandRoles && r.shorthand ? r.shorthand : r.name).toLowerCase());
  if (hasDup(resolvedRoleLabels)) issues.push("Two or more roles resolve to the same Figma path.");

  const resolvedVarLabels = activeVariations.map((v) => (state.useShorthandVariations && v.shorthand ? v.shorthand : v.name).toLowerCase());
  if (hasDup(resolvedVarLabels)) issues.push("Two or more variations resolve to the same Figma path.");

  const colorNames = state.colors.map((c) => c.name.trim().toLowerCase());
  const colorShorts = state.colors.map((c) => (c.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const roleNames = state.roles.map((r) => r.name.trim().toLowerCase());
  const roleShorts = state.roles.map((r) => (r.shorthand || "").trim().toLowerCase()).filter(Boolean);

  if (hasDup(colorNames)) issues.push("Two or more colors share the same name.");
  if (colorShorts.length && hasDup(colorShorts)) issues.push("Two or more colors share the same shorthand.");
  if (hasDup(roleNames)) issues.push("Two or more roles share the same name.");
  if (roleShorts.length && hasDup(roleShorts)) issues.push("Two or more roles share the same shorthand.");

  return issues.length > 0 ? issues : null;
}

// ── Versions helpers ─────────────────────────────────────────────────────────

function stripIds(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripIds);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as object)) {
      if (k !== "_id") out[k] = stripIds((obj as Record<string, unknown>)[k]);
    }
    return out;
  }
  return obj;
}

function snapWithoutVersions(state: AppState): Omit<AppState, "versions"> {
  const snap = JSON.parse(JSON.stringify(state)) as AppState;
  delete (snap as Partial<AppState>).versions;
  return snap;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return Math.floor(diff / 86400000) + "d ago";
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface AppStoreState {
  appState: AppState;
  savedState: AppState | null;
  stateHash: string;

  // Loading
  loadState: (incoming: Partial<AppState>) => void;
  setSavedState: (snapshot: AppState | null) => void;
  getSavedState: () => AppState | null;
  markClean: () => void;
  isDirty: () => boolean;

  // Global app field setter (used by settings overlay)
  setAppField: <K extends keyof AppState>(key: K, value: AppState[K]) => void;

  // Project
  updateProjectName: (value: string) => void;
  updateProjectDescription: (value: string) => void;

  // Colors — set / add / remove / move
  setColor: (idx: number, key: keyof Color | string, value: string) => void;
  addColor: () => void;
  addColorWith: (name: string, value: string, shorthand?: string) => void;
  removeColor: (idx: number) => void;
  moveColor: (from: number, to: number) => void;

  // Roles — set / add / remove / move
  setRole: (idx: number, key: keyof Role | string, value: string | MappingMethod) => void;
  addRole: () => void;
  addRoleWith: (name: string, shorthand: string, minContrast: number, variationTargets: number[]) => void;
  removeRole: (idx: number) => void;
  moveRole: (from: number, to: number) => void;
  setRoleVariation: (roleIdx: number, varIdx: number, field: string, value: string) => void;
  addRoleVariation: (roleIdx: number) => void;
  removeRoleVariation: (roleIdx: number, varIdx: number) => void;
  toggleRoleCustomVariations: (roleIdx: number) => void;
  setRoleScope: (roleIdx: number, colorIds: string[] | null) => void;
  setRoleLocalBg: (roleIdx: number, localBg: import('../types/state').RoleLocalBg | null) => void;
  setRoleScopes: (roleIdx: number, scopes: VariableScope[] | null) => void;

  // Shared variations — set / add / remove / move
  setVariation: (idx: number, field: string, value: string) => void;
  addVariation: () => void;
  removeVariation: (idx: number) => void;
  moveVariation: (from: number, to: number) => void;

  // Scale step names — set / init / remove
  setScaleStepName: (idx: number, field: "name" | "shorthand", value: string) => void;
  addScaleStepName: () => void;
  removeScaleStepName: (idx: number) => void;

  // Themes — set / add / remove / move
  setTheme: (idx: number, field: keyof Theme, value: string) => void;
  addTheme: () => void;
  removeTheme: (idx: number) => void;
  moveTheme: (from: number, to: number) => void;

  // Versions
  versionSaveBlockedReason: () => string | null;
  lastSavedVersion: () => AppState["versions"][number] | null;
  isDefaultState: () => boolean;
  saveVersion: (name: string, description: string) => boolean;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;

  // Validation
  validate: () => ValidationIssues;
}

// ── Store ────────────────────────────────────────────────────────────────────

const _bootstrap = makeBootstrapState();

export const useAppStore = create<AppStoreState>((set, get) => ({
  appState: _bootstrap,
  savedState: null,
  stateHash: computeHash(_bootstrap),

  // ── Loading ──

  loadState: (incoming) => {
    set((s) => {
      const next = { ...s.appState, ...incoming };
      (next.roles ?? []).forEach((r) => {
        if (!r.mappingMethod) r.mappingMethod = "contrast";
      });
      ensureIds(next);
      ensureVariations(next);
      const hash = computeHash(next);
      return { appState: next, stateHash: hash };
    });
  },

  setSavedState: (snapshot) => {
    set({ savedState: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null });
  },

  getSavedState: () => get().savedState,

  markClean: () => {
    set((s) => ({ stateHash: computeHash(s.appState) }));
  },

  isDirty: () => computeHash(get().appState) !== get().stateHash,

  // ── Global field setter ──

  setAppField: (key, value) => {
    set((s) => {
      const next: AppState = { ...s.appState, [key]: value };
      if (key === 'scaleLength' && s.appState.scaleStepNames) {
        const len = Math.max(1, parseInt(value as string) || 23);
        const existing = s.appState.scaleStepNames;
        if (existing.length !== len) {
          const padded = [...existing];
          while (padded.length < len) padded.push({ _id: generateId(), name: '', shorthand: '' });
          next.scaleStepNames = padded.slice(0, len);
        }
      }
      return { appState: next };
    });
  },

  // ── Project ──

  updateProjectName: (value) => {
    set((s) => ({ appState: { ...s.appState, name: value } }));
  },

  updateProjectDescription: (value) => {
    set((s) => ({ appState: { ...s.appState, description: value } }));
  },

  // ── Colors ──

  setColor: (idx, key, value) => {
    set((s) => {
      const colors = [...s.appState.colors];
      if (!colors[idx]) return s;
      let val: string = value;
      if (key === "value") val = sanitizeHex(value);
      if (key === "name" || key === "shorthand") val = normalizeSegment(value);
      const updated: Color = { ...colors[idx], [key]: val };
      if (key === "name") {
        const currentShort = colors[idx].shorthand || '';
        updated.shorthand = syncShorthandToName(val, currentShort);
      }
      colors[idx] = updated;
      return { appState: { ...s.appState, colors } };
    });
  },

  addColor: () => {
    set((s) => {
      const preset = pickPreset(PRESET_COLORS, s.appState.colors, (n) => ({ name: `Color ${n}`, shorthand: `c${n}`, value: '#888888' }));
      const color: Color = { _id: generateId(), name: preset.name, shorthand: preset.shorthand, value: preset.value, description: '' };
      return { appState: { ...s.appState, colors: [...s.appState.colors, color] } };
    });
  },

  addColorWith: (name, value, shorthand = '') => {
    set((s) => {
      const color: Color = { _id: generateId(), name, shorthand: shorthand || deriveShorthand(name), value: value.startsWith('#') ? value : `#${value}`, description: '' };
      return { appState: { ...s.appState, colors: [...s.appState.colors, color] } };
    });
  },

  removeColor: (idx) => {
    set((s) => {
      const colors = s.appState.colors.filter((_, i) => i !== idx);
      return { appState: { ...s.appState, colors } };
    });
  },

  moveColor: (from, to) => {
    set((s) => {
      const colors = [...s.appState.colors];
      const [item] = colors.splice(from, 1);
      colors.splice(to, 0, item);
      return { appState: { ...s.appState, colors } };
    });
  },

  // ── Roles ──

  setRole: (idx, key, value) => {
    set((s) => {
      const roles = [...s.appState.roles];
      if (!roles[idx]) return s;
      const role = { ...roles[idx] };

      if (typeof key === "string" && key.startsWith("variationTarget:")) {
        const vi = parseInt(key.slice("variationTarget:".length), 10);
        const targets = [...(role.variationTargets ?? [])];
        const isIndex = role.mappingMethod === "index";
        if (isIndex) {
          let v = parseInt(value as string);
          if (isNaN(v) || v < 0) v = 0;
          targets[vi] = Math.min(s.appState.scaleLength - 1, v);
        } else {
          let v = parseFloat(value as string);
          if (isNaN(v) || v < 1) v = 1;
          targets[vi] = Math.min(21, v);
        }
        role.variationTargets = targets;
        roles[idx] = role;
        return { appState: { ...s.appState, roles } };
      }

      if (key === "minContrast") {
        let v = parseFloat(value as string);
        if (isNaN(v)) v = 1;
        role.minContrast = Math.max(1, Math.min(21, v));
        roles[idx] = role;
        return { appState: { ...s.appState, roles } };
      }

      if (key === "mappingMethod") {
        role.mappingMethod = value === "index" ? "index" : "contrast";
        roles[idx] = role;
        return { appState: { ...s.appState, roles } };
      }

      if (key === "name" || key === "shorthand") {
        (role as Record<string, unknown>)[key] = normalizeSegment(value as string);
        if (key === "name") {
          const newName = normalizeSegment(value as string);
          role.shorthand = syncShorthandToName(newName, roles[idx].shorthand || '');
        }
      } else {
        (role as Record<string, unknown>)[key as string] = value;
      }

      roles[idx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  addRole: () => {
    set((s) => {
      const varCount = (s.appState.variations ?? []).length || 5;
      const preset = pickPreset(PRESET_ROLES, s.appState.roles, (n) => ({ name: `Role ${n}`, shorthand: `r${n}` }));
      const role: Role = {
        _id: generateId(),
        name: preset.name,
        shorthand: preset.shorthand,
        minContrast: 4.5,
        mappingMethod: "contrast",
        variationTargets: Array.from({ length: varCount }, (_, i) => DEFAULT_VARIATION_TARGETS[i] ?? 4.5),
        customVariationList: false,
        customVariations: [],
      };
      return { appState: { ...s.appState, roles: [...s.appState.roles, role] } };
    });
  },

  addRoleWith: (name, shorthand, minContrast, variationTargets) => {
    set((s) => {
      const role: Role = {
        _id: generateId(),
        name,
        shorthand: shorthand || deriveShorthand(name),
        minContrast,
        mappingMethod: 'contrast',
        variationTargets,
        customVariationList: false,
        customVariations: [],
      };
      return { appState: { ...s.appState, roles: [...s.appState.roles, role] } };
    });
  },

  removeRole: (idx) => {
    set((s) => {
      const roles = s.appState.roles.filter((_, i) => i !== idx);
      return { appState: { ...s.appState, roles } };
    });
  },

  moveRole: (from, to) => {
    set((s) => {
      const roles = [...s.appState.roles];
      const [item] = roles.splice(from, 1);
      roles.splice(to, 0, item);
      return { appState: { ...s.appState, roles } };
    });
  },

  setRoleVariation: (roleIdx, varIdx, field, value) => {
    set((s) => {
      const roles = [...s.appState.roles];
      const role = { ...roles[roleIdx] };
      if (!role?.customVariations) return s;
      if (varIdx < 0 || varIdx >= role.customVariations.length) return s;
      const vars = [...role.customVariations];
      const val = field === "name" || field === "shorthand" ? normalizeSegment(value) : value;
      vars[varIdx] = { ...vars[varIdx], [field]: val };
      role.customVariations = vars;
      roles[roleIdx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  addRoleVariation: (roleIdx) => {
    set((s) => {
      const roles = [...s.appState.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      const newVar: Variation = { _id: generateId(), name: "Variation", shorthand: "" };
      role.customVariations = [...(role.customVariations ?? []), newVar];
      role.variationTargets = [...(role.variationTargets ?? []), 4.5];
      roles[roleIdx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  removeRoleVariation: (roleIdx, varIdx) => {
    set((s) => {
      const roles = [...s.appState.roles];
      const role = { ...roles[roleIdx] };
      if (!role?.customVariations) return s;
      role.customVariations = role.customVariations.filter((_, i) => i !== varIdx);
      role.variationTargets = (role.variationTargets ?? []).filter((_, i) => i !== varIdx);
      roles[roleIdx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  toggleRoleCustomVariations: (roleIdx) => {
    set((s) => {
      const roles = [...s.appState.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      const turning = !role.customVariationList;
      role.customVariationList = turning;
      if (turning && (!role.customVariations || role.customVariations.length === 0)) {
        const shared = s.appState.variations ?? [];
        role.customVariations = shared.map((v) => ({ ...v, _id: generateId() }));
        role.variationTargets = [...(role.variationTargets ?? [])];
      }
      roles[roleIdx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  setRoleScope: (roleIdx, colorIds) => {
    set((s) => {
      const roles = [...s.appState.roles];
      roles[roleIdx] = { ...roles[roleIdx], scopedColorIds: colorIds };
      return { appState: { ...s.appState, roles } };
    });
  },

  setRoleLocalBg: (roleIdx, localBg) => {
    set((s) => {
      const roles = [...s.appState.roles];
      roles[roleIdx] = { ...roles[roleIdx], localBg };
      return { appState: { ...s.appState, roles } };
    });
  },

  setRoleScopes: (roleIdx, scopes) => {
    set((s) => {
      const roles = [...s.appState.roles];
      roles[roleIdx] = { ...roles[roleIdx], scopes: scopes ?? undefined };
      return { appState: { ...s.appState, roles } };
    });
  },

  // ── Shared variations ──

  setVariation: (idx, field, value) => {
    set((s) => {
      const variations = [...(s.appState.variations ?? [])];
      if (!variations[idx]) return s;
      const val = field === "name" || field === "shorthand" ? normalizeSegment(value) : value;
      variations[idx] = { ...variations[idx], [field]: val };
      return { appState: { ...s.appState, variations } };
    });
  },

  addVariation: () => {
    set((s) => {
      const newVar: Variation = { _id: generateId(), name: "Variation", shorthand: "" };
      const variations = [...(s.appState.variations ?? []), newVar];
      const roles = s.appState.roles.map((r) => ({
        ...r,
        variationTargets: [...(r.variationTargets ?? []), 4.5],
      }));
      return { appState: { ...s.appState, variations, roles } };
    });
  },

  removeVariation: (idx) => {
    set((s) => {
      const variations = (s.appState.variations ?? []).filter((_, i) => i !== idx);
      const roles = s.appState.roles.map((r) => ({
        ...r,
        variationTargets: (r.variationTargets ?? []).filter((_, i) => i !== idx),
      }));
      return { appState: { ...s.appState, variations, roles } };
    });
  },

  moveVariation: (from, to) => {
    set((s) => {
      const variations = [...(s.appState.variations ?? [])];
      const [item] = variations.splice(from, 1);
      variations.splice(to, 0, item);
      const roles = s.appState.roles.map((r) => {
        const targets = [...(r.variationTargets ?? [])];
        const [t] = targets.splice(from, 1);
        targets.splice(to, 0, t);
        return { ...r, variationTargets: targets };
      });
      return { appState: { ...s.appState, variations, roles } };
    });
  },

  // ── Scale step names ──

  setScaleStepName: (idx, field, value) => {
    set((s) => {
      const steps = [...(s.appState.scaleStepNames ?? [])];
      if (!steps[idx]) return s;
      steps[idx] = { ...steps[idx], [field]: value };
      return { appState: { ...s.appState, scaleStepNames: steps } };
    });
  },

  addScaleStepName: () => {
    set((s) => {
      const len = Math.max(1, parseInt(s.appState.scaleLength as unknown as string) || 23);
      const existing = s.appState.scaleStepNames ?? [];
      const steps = [...existing];
      while (steps.length < len) steps.push({ _id: generateId(), name: '', shorthand: '' });
      return { appState: { ...s.appState, scaleStepNames: steps.slice(0, len) } };
    });
  },

  removeScaleStepName: (idx) => {
    set((s) => {
      const steps = [...(s.appState.scaleStepNames ?? [])];
      if (steps[idx]) steps[idx] = { ...steps[idx], name: '', shorthand: '' };
      const allEmpty = steps.every((s) => !s.name && !s.shorthand);
      return { appState: { ...s.appState, scaleStepNames: allEmpty ? null : steps } };
    });
  },

  // ── Themes ──

  setTheme: (idx, field, value) => {
    set((s) => {
      const themes = [...s.appState.themes];
      if (!themes[idx]) return s;
      const val = field === "bg" ? sanitizeHex(value) : value;
      themes[idx] = { ...themes[idx], [field]: val };
      return { appState: { ...s.appState, themes } };
    });
  },

  addTheme: () => {
    set((s) => {
      const theme: Theme = { _id: generateId(), name: "Theme", bg: "#FFFFFF" };
      return { appState: { ...s.appState, themes: [...s.appState.themes, theme] } };
    });
  },

  removeTheme: (idx) => {
    set((s) => {
      const themes = s.appState.themes.filter((_, i) => i !== idx);
      return { appState: { ...s.appState, themes } };
    });
  },

  moveTheme: (from, to) => {
    set((s) => {
      const themes = [...s.appState.themes];
      const [item] = themes.splice(from, 1);
      themes.splice(to, 0, item);
      return { appState: { ...s.appState, themes } };
    });
  },

  // ── Versions ──

  versionSaveBlockedReason: () => {
    const { appState } = get();
    const versions = appState.versions ?? [];
    const snap = snapWithoutVersions(appState);
    const snapStr = JSON.stringify(snap);
    if (JSON.stringify(stripIds(snap)) === JSON.stringify(stripIds(snapWithoutVersions(makeBootstrapState())))) {
      return "Nothing to save! Still at square one.";
    }
    if (versions.length > 0 && snapStr === JSON.stringify(versions[0].state)) {
      return `No changes since "${versions[0].name}" (${relativeTime(versions[0].createdAt)})`;
    }
    return null;
  },

  lastSavedVersion: () => {
    const { appState } = get();
    const versions = appState.versions ?? [];
    if (versions.length === 0) return null;
    const snap = snapWithoutVersions(appState);
    return JSON.stringify(snap) === JSON.stringify(versions[0].state) ? versions[0] : null;
  },

  isDefaultState: () => {
    const { appState } = get();
    const snap = snapWithoutVersions(appState);
    const boot = snapWithoutVersions(makeBootstrapState());
    return JSON.stringify(stripIds(snap)) === JSON.stringify(stripIds(boot));
  },

  saveVersion: (name, description) => {
    if (!name?.trim()) return false;
    const reason = get().versionSaveBlockedReason();
    if (reason) return false;
    set((s) => {
      const snap = snapWithoutVersions(s.appState);
      const versions = [{ _id: generateId(), name: name.trim(), description, createdAt: Date.now(), state: snap }, ...(s.appState.versions ?? [])];
      return { appState: { ...s.appState, versions } };
    });
    return true;
  },

  restoreVersion: (id) => {
    const { appState, loadState } = get();
    const v = (appState.versions ?? []).find((v) => v._id === id);
    if (!v) return;
    const savedVersions = appState.versions;
    loadState(JSON.parse(JSON.stringify(v.state)));
    set((s) => ({ appState: { ...s.appState, versions: savedVersions } }));
  },

  deleteVersion: (id) => {
    set((s) => ({
      appState: {
        ...s.appState,
        versions: (s.appState.versions ?? []).filter((v) => v._id !== id),
      },
    }));
  },

  // ── Validation ──

  validate: () => validateState(get().appState),
}));
