import { create } from "zustand";
import type { ProjectStore, Color, Role, Theme, Variation, ValidationIssues, MappingMethod } from "../types/state";

// ── Constants ────────────────────────────────────────────────────────────────

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
  { name: "Crimson", shorthand: "cr", value: "#DC143C" },
  { name: "Coral", shorthand: "co", value: "#FF6B6B" },
  { name: "Tomato", shorthand: "to", value: "#FF4500" },
  { name: "Orange", shorthand: "or", value: "#FF7F00" },
  { name: "Amber", shorthand: "am", value: "#F59E0B" },
  { name: "Gold", shorthand: "gd", value: "#FFD700" },
  { name: "Lime", shorthand: "li", value: "#84CC16" },
  { name: "Emerald", shorthand: "em", value: "#10B981" },
  { name: "Teal", shorthand: "te", value: "#14B8A6" },
  { name: "Cyan", shorthand: "cy", value: "#06B6D4" },
  { name: "Sky", shorthand: "sk", value: "#0EA5E9" },
  { name: "Blue", shorthand: "bl", value: "#3B82F6" },
  { name: "Cobalt", shorthand: "cb", value: "#0047AB" },
  { name: "Indigo", shorthand: "in", value: "#6366F1" },
  { name: "Violet", shorthand: "vi", value: "#7C3AED" },
  { name: "Purple", shorthand: "pu", value: "#A855F7" },
  { name: "Fuchsia", shorthand: "fu", value: "#D946EF" },
  { name: "Pink", shorthand: "pk", value: "#EC4899" },
  { name: "Rose", shorthand: "ro", value: "#F43F5E" },
  { name: "Brown", shorthand: "br", value: "#92400E" },
  { name: "Sienna", shorthand: "si", value: "#A0522D" },
  { name: "Sand", shorthand: "sa", value: "#C2B280" },
  { name: "Slate", shorthand: "sl", value: "#64748B" },
  { name: "Stone", shorthand: "st", value: "#78716C" },
  { name: "Zinc", shorthand: "zn", value: "#71717A" },
  { name: "Gray", shorthand: "gr", value: "#6B7280" },
  { name: "Neutral", shorthand: "nt", value: "#737373" },
  { name: "Charcoal", shorthand: "ch", value: "#374151" },
  { name: "Navy", shorthand: "nv", value: "#1E3A5F" },
  { name: "Forest", shorthand: "fo", value: "#166534" },
  { name: "Olive", shorthand: "ol", value: "#6B7C2C" },
  { name: "Mint", shorthand: "mn", value: "#A7F3D0" },
  { name: "Lavender", shorthand: "lv", value: "#C4B5FD" },
  { name: "Peach", shorthand: "pe", value: "#FBBF9C" },
  { name: "Midnight", shorthand: "md", value: "#121212" },
  { name: "Magenta", shorthand: "mg", value: "#FF00FF" },
  { name: "Turquoise", shorthand: "tu", value: "#40E0D0" },
  { name: "Maroon", shorthand: "mr", value: "#800000" },
  { name: "Burgundy", shorthand: "bu", value: "#800020" },
  { name: "Scarlet", shorthand: "sc", value: "#FF2400" },
  { name: "Tangerine", shorthand: "tg", value: "#F28500" },
];

const PRESET_ROLES = [
  { name: "Text", shorthand: "tx" },
  { name: "Fill", shorthand: "fi" },
  { name: "Background", shorthand: "bg" },
  { name: "Border", shorthand: "bd" },
  { name: "Icon", shorthand: "ic" },
  { name: "Surface", shorthand: "su" },
  { name: "Overlay", shorthand: "ov" },
  { name: "Accent", shorthand: "ac" },
  { name: "Muted", shorthand: "mu" },
  { name: "Subtle", shorthand: "sb" },
  { name: "Emphasis", shorthand: "em" },
  { name: "Link", shorthand: "lk" },
  { name: "Placeholder", shorthand: "ph" },
  { name: "Disabled", shorthand: "ds" },
  { name: "Success", shorthand: "ok" },
  { name: "Warning", shorthand: "wn" },
  { name: "Error", shorthand: "er" },
  { name: "Info", shorthand: "nf" },
  { name: "Inverse", shorthand: "iv" },
];

function pickPreset<T extends { name: string; shorthand: string }>(pool: T[], existing: { name: string; shorthand?: string }[], fallback: (n: number) => T): T {
  const usedNames = new Set(existing.map((x) => x.name.toLowerCase()));
  const usedShorthands = new Set(existing.map((x) => (x.shorthand ?? "").toLowerCase()));
  const available = pool.filter((p) => !usedNames.has(p.name.toLowerCase()) && !usedShorthands.has(p.shorthand.toLowerCase()));
  if (available.length > 0) return available[Math.floor(Math.random() * available.length)];
  return fallback(existing.length + 1);
}

// ── Identity helpers ─────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function ensureIds<T extends Partial<ProjectStore>>(state: T): T {
  state.colors?.forEach((c) => {
    if (!c._id) c._id = generateId();
  });
  state.roles?.forEach((r) => {
    if (!r._id) r._id = generateId();
  });
  state.themes?.forEach((t) => {
    if (!t._id) t._id = generateId();
  });
  state.scaleSteps?.forEach((s) => {
    if (!s._id) s._id = generateId();
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
  if (!name) return "";
  const words = name
    .trim()
    .split(/[\s_\-/]+/)
    .filter(Boolean);
  if (words.length >= 2) {
    // Multi-word: initials, up to 4 chars
    return words
      .map((w) => w[0])
      .join("")
      .toLowerCase()
      .slice(0, 4);
  }
  // Single word: first consonant + next consonant, else first 2 chars
  const w = words[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (w.length <= 2) return w;
  // Keep first char always, then find first consonant after it
  const rest = w
    .slice(1)
    .split("")
    .filter((c) => /[bcdfghjklmnpqrstvwxyz]/.test(c));
  if (rest.length >= 1) return w[0] + rest[0];
  return w.slice(0, 2);
}

// Returns the new name for an item when grouping selected items together.
// Finds the common group prefix of all selected names, then nests a new
// "Untitled" subgroup within that prefix so items stay inside their parent group.
// e.g. selected = ["Brand/Primary", "Brand/Accent"] → "Brand/Untitled/Primary"
//      selected = ["Primary", "Accent"]              → "Untitled/Primary"
export function groupedName(itemName: string, selectedNames: string[]): string {
  const segs = selectedNames.map((n) => n.split("/").slice(0, -1));
  // Find longest common prefix across all selected items' group paths
  const minLen = Math.min(...segs.map((s) => s.length));
  const common: string[] = [];
  for (let i = 0; i < minLen; i++) {
    const seg = segs[0][i];
    if (segs.every((s) => s[i] === seg)) common.push(seg);
    else break;
  }
  const leaf = itemName.split("/").pop()!;
  return common.length > 0 ? `${common.join("/")}/Untitled/${leaf}` : `Untitled/${leaf}`;
}

export function segmentDepth(str: string): number {
  if (!str || typeof str !== "string") return 1;
  return str.split("/").filter(Boolean).length;
}

// When a name gains or loses group segments (e.g. "Brand/Primary" vs "Primary"),
// keep the shorthand in sync by deriving a shorthand for each group prefix segment
// while preserving the leaf shorthand the user may have set.
export function syncShorthandToName(name: string, shorthand: string): string {
  const nameSegs = name.split("/").filter(Boolean);
  const shortSegs = shorthand ? shorthand.split("/").filter(Boolean) : [];
  if (nameSegs.length === shortSegs.length) return shorthand; // already in sync
  const leafShort = shortSegs.length > 0 ? shortSegs[shortSegs.length - 1] : deriveShorthand(nameSegs[nameSegs.length - 1]);
  const prefixShorts = nameSegs.slice(0, -1).map((seg) => deriveShorthand(seg));
  return [...prefixShorts, leafShort].join("/");
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
  { name: "Subtle", shorthand: "1", target: 1.5 },
  { name: "Soft", shorthand: "2", target: 3.0 },
  { name: "Default", shorthand: "3", target: 4.5 },
  { name: "Strong", shorthand: "4", target: 7.0 },
  { name: "Bold", shorthand: "5", target: 12.0 },
];

export function makeBootstrapState(): ProjectStore {
  const variations: Variation[] = DEFAULT_VARIATIONS.map((d) => ({
    ...d,
    _id: generateId(),
  }));

  const state: ProjectStore = {
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
    alphaValues: [],
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: "_scale",
    tokenCollectionName: "color tokens",
    scaleSteps: null,
    variations,
    canEditRoleVariantNames: false,
    colors: [
      { _id: generateId(), name: "Primary", shorthand: "pr", value: "#0066FF", description: "" },
      { _id: generateId(), name: "Gray", shorthand: "gr", value: "#6B7280", description: "" },
    ],
    roles: [
      { _id: generateId(), name: "Text", shorthand: "tx", mappingMethod: "contrast", variations: null },
      { _id: generateId(), name: "Background", shorthand: "bg", mappingMethod: "contrast", variations: null },
      { _id: generateId(), name: "Border", shorthand: "bd", mappingMethod: "contrast", variations: null },
    ],
    themes: [
      { _id: generateId(), name: "Light", bg: "#FFFFFF" },
      { _id: generateId(), name: "Dark", bg: "#0F0F0F" },
    ],
  };

  return state;
}

// ── ensureVariations ─────────────────────────────────────────────────────────

export function ensureVariations(state: ProjectStore): void {
  // ── Normalize alphaValues ──
  if (typeof state.alphaValues === "string") {
    state.alphaValues = (state.alphaValues as string)
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => !isNaN(v) && v >= 0 && v <= 100);
  } else if (!Array.isArray(state.alphaValues)) {
    state.alphaValues = [];
  }

  // ── Ensure global variations exist ──
  if (!state.variations || state.variations.length === 0) {
    state.variations = DEFAULT_VARIATIONS.map((d) => ({ ...d, _id: generateId() }));
  } else {
    state.variations.forEach((v) => {
      if (!v._id) v._id = generateId();
    });
  }

  // ── Ensure each variation has a target ──
  for (const v of state.variations) {
    if (v.target == null) v.target = 4.5;
  }
  for (const role of state.roles) {
    if (role.variations) {
      role.variations.forEach((v) => {
        if (!v._id) v._id = generateId();
        if (v.target == null) v.target = 4.5;
      });
    }
  }
}

// ── Dirty hash ───────────────────────────────────────────────────────────────

export function computeHash(state: ProjectStore): string {
  // Normalize color values so #FFF and #ffffff hash identically
  const colors = state.colors.map((c) => ({ ...c, value: normalizeHex(c.value || "") }));
  const { versions: _versions, ...rest } = state;
  return JSON.stringify({ ...rest, colors });
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateProjectStore(store: ProjectStore): ValidationIssues {
  if (!store.colors || store.colors.length === 0) return ["Add at least one color before running."];
  if (!store.roles || store.roles.length === 0) return ["Add at least one role before running."];

  const issues: string[] = [];
  const hasDup = (arr: string[]) => new Set(arr).size !== arr.length;
  const activeVariations = store.variations ?? [];

  if (store.colors.some((c) => !c.name?.trim())) issues.push("One or more colors has an empty name.");
  if (store.roles.some((r) => !r.name?.trim())) issues.push("One or more roles has an empty name.");
  if (activeVariations.some((v) => !v.name?.trim())) issues.push("One or more variations has an empty name.");

  for (const c of store.colors) {
    if (c.shorthand && segmentDepth(c.shorthand) !== segmentDepth(c.name)) issues.push(`Color "${c.name}": shorthand segments must match name segments.`);
  }
  for (const r of store.roles) {
    if (r.shorthand && segmentDepth(r.shorthand) !== segmentDepth(r.name)) issues.push(`Role "${r.name}": shorthand segments must match name segments.`);
  }
  for (const v of activeVariations) {
    if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name)) issues.push(`Variation "${v.name}": shorthand segments must match name segments.`);
  }
  for (const r of store.roles) {
    if (!r.variations) continue;
    for (const v of r.variations) {
      if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name)) issues.push(`Variation "${v.name}" (role "${r.name}"): shorthand segments must match name segments.`);
    }
  }

  const resolvedColorLabels = store.colors.map((c) => (store.useShorthandColors && c.shorthand ? c.shorthand : c.name).toLowerCase());
  if (hasDup(resolvedColorLabels)) issues.push("Two or more colors resolve to the same Figma path.");

  const resolvedRoleLabels = store.roles.map((r) => (store.useShorthandRoles && r.shorthand ? r.shorthand : r.name).toLowerCase());
  if (hasDup(resolvedRoleLabels)) issues.push("Two or more roles resolve to the same Figma path.");

  const resolvedVarLabels = activeVariations.map((v) => (store.useShorthandVariations && v.shorthand ? v.shorthand : v.name).toLowerCase());
  if (hasDup(resolvedVarLabels)) issues.push("Two or more variations resolve to the same Figma path.");

  const colorNames = store.colors.map((c) => c.name.trim().toLowerCase());
  const colorShorts = store.colors.map((c) => (c.shorthand || "").trim().toLowerCase()).filter(Boolean);
  const roleNames = store.roles.map((r) => r.name.trim().toLowerCase());
  const roleShorts = store.roles.map((r) => (r.shorthand || "").trim().toLowerCase()).filter(Boolean);

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

function snapWithoutVersions(state: ProjectStore): Omit<ProjectStore, "versions"> {
  const snap = JSON.parse(JSON.stringify(state)) as ProjectStore;
  delete (snap as Partial<ProjectStore>).versions;
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

interface projectStoreState {
  projectStore: ProjectStore;
  savedState: ProjectStore | null;
  stateHash: string;

  // Loading
  loadState: (incoming: Partial<ProjectStore>) => void;
  setSavedState: (snapshot: ProjectStore | null) => void;
  getSavedState: () => ProjectStore | null;
  markClean: () => void;
  isDirty: () => boolean;

  // Global app field setter (used by settings overlay)
  setProjectField: <K extends keyof ProjectStore>(key: K, value: ProjectStore[K]) => void;

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
  addRoleWith: (name: string, shorthand: string) => void;
  removeRole: (idx: number) => void;
  moveRole: (from: number, to: number) => void;
  setRoleVariation: (roleIdx: number, varIdx: number, field: string, value: string) => void;
  addRoleVariation: (roleIdx: number) => void;
  removeRoleVariation: (roleIdx: number, varIdx: number) => void;
  toggleRoleCustomVariations: (roleIdx: number) => void;
  setRoleScope: (roleIdx: number, colorIds: string[] | null) => void;
  setRoleLocalBg: (roleIdx: number, localBg: import("../types/state").RoleLocalBg | null) => void;
  setRoleScopes: (roleIdx: number, scopes: VariableScope[] | null) => void;

  // Shared variations — set / add / remove / move
  setVariation: (idx: number, field: string, value: string) => void;
  addVariation: () => void;
  removeVariation: (idx: number) => void;
  moveVariation: (from: number, to: number) => void;

  // Scale step names — set / init / remove
  setScaleStep: (idx: number, field: "name" | "shorthand", value: string) => void;
  addScaleStep: () => void;
  removeScaleStep: (idx: number) => void;

  // Themes — set / add / remove / move
  setTheme: (idx: number, field: keyof Theme, value: string) => void;
  addTheme: () => void;
  removeTheme: (idx: number) => void;
  moveTheme: (from: number, to: number) => void;

  // Versions
  versionSaveBlockedReason: () => string | null;
  lastSavedVersion: () => ProjectStore["versions"][number] | null;
  isDefaultState: () => boolean;
  saveVersion: (name: string, description: string) => boolean;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;

  // Validation
  validate: () => ValidationIssues;
}

// ── Store ────────────────────────────────────────────────────────────────────

const _bootstrap = makeBootstrapState();

export const useProjectStore = create<projectStoreState>((set, get) => ({
  projectStore: _bootstrap,
  savedState: null,
  stateHash: computeHash(_bootstrap),

  // ── Loading ──

  loadState: (incoming) => {
    set((s) => {
      const next = { ...s.projectStore, ...incoming };
      (next.roles ?? []).forEach((r) => {
        if (!r.mappingMethod) r.mappingMethod = "contrast";
      });
      ensureIds(next);
      ensureVariations(next);
      const hash = computeHash(next);
      return { projectStore: next, stateHash: hash };
    });
  },

  setSavedState: (snapshot) => {
    set({ savedState: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null });
  },

  getSavedState: () => get().savedState,

  markClean: () => {
    set((s) => ({ stateHash: computeHash(s.projectStore) }));
  },

  isDirty: () => computeHash(get().projectStore) !== get().stateHash,

  // ── Global field setter ──

  setProjectField: (key, value) => {
    set((s) => {
      const next: ProjectStore = { ...s.projectStore, [key]: value };
      if (key === "canEditRoleVariantNames" && value === false) {
        next.roles = next.roles.map((r) => ({ ...r, variations: null }));
      }
      if (key === "scaleLength" && s.projectStore.scaleSteps) {
        const len = Math.max(1, parseInt(value as string) || 23);
        const existing = s.projectStore.scaleSteps;
        if (existing.length !== len) {
          const padded = [...existing];
          while (padded.length < len) padded.push({ _id: generateId(), name: "", shorthand: "", index: padded.length });
          next.scaleSteps = padded.slice(0, len);
        }
      }
      return { projectStore: next };
    });
  },

  // ── Project ──

  updateProjectName: (value) => {
    set((s) => ({ projectStore: { ...s.projectStore, name: value } }));
  },

  updateProjectDescription: (value) => {
    set((s) => ({ projectStore: { ...s.projectStore, description: value } }));
  },

  // ── Colors ──

  setColor: (idx, key, value) => {
    set((s) => {
      const colors = [...s.projectStore.colors];
      if (!colors[idx]) return s;
      let val: string = value;
      if (key === "value") val = sanitizeHex(value);
      if (key === "name" || key === "shorthand") val = normalizeSegment(value);
      const updated: Color = { ...colors[idx], [key]: val };
      if (key === "name") {
        const currentShort = colors[idx].shorthand || "";
        updated.shorthand = syncShorthandToName(val, currentShort);
      }
      colors[idx] = updated;
      return { projectStore: { ...s.projectStore, colors } };
    });
  },

  addColor: () => {
    set((s) => {
      const preset = pickPreset(PRESET_COLORS, s.projectStore.colors, (n) => ({ name: `Color ${n}`, shorthand: `c${n}`, value: "#888888" }));
      const color: Color = { _id: generateId(), name: preset.name, shorthand: preset.shorthand, value: preset.value, description: "" };
      return { projectStore: { ...s.projectStore, colors: [...s.projectStore.colors, color] } };
    });
  },

  addColorWith: (name, value, shorthand = "") => {
    set((s) => {
      const color: Color = { _id: generateId(), name, shorthand: shorthand || deriveShorthand(name), value: value.startsWith("#") ? value : `#${value}`, description: "" };
      return { projectStore: { ...s.projectStore, colors: [...s.projectStore.colors, color] } };
    });
  },

  removeColor: (idx) => {
    set((s) => {
      const colors = s.projectStore.colors.filter((_, i) => i !== idx);
      return { projectStore: { ...s.projectStore, colors } };
    });
  },

  moveColor: (from, to) => {
    set((s) => {
      const colors = [...s.projectStore.colors];
      const [item] = colors.splice(from, 1);
      colors.splice(to, 0, item);
      return { projectStore: { ...s.projectStore, colors } };
    });
  },

  // ── Roles ──

  setRole: (idx, key, value) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      if (!roles[idx]) return s;
      const role = { ...roles[idx] };

      if (key === "mappingMethod") {
        role.mappingMethod = value === "index" ? "index" : "contrast";
        roles[idx] = role;
        return { projectStore: { ...s.projectStore, roles } };
      }

      if (key === "name" || key === "shorthand") {
        (role as Record<string, unknown>)[key] = normalizeSegment(value as string);
        if (key === "name") {
          const newName = normalizeSegment(value as string);
          role.shorthand = syncShorthandToName(newName, roles[idx].shorthand || "");
        }
      } else {
        (role as Record<string, unknown>)[key as string] = value;
      }

      roles[idx] = role;
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  addRole: () => {
    set((s) => {
      const preset = pickPreset(PRESET_ROLES, s.projectStore.roles, (n) => ({ name: `Role ${n}`, shorthand: `r${n}` }));
      const role: Role = {
        _id: generateId(),
        name: preset.name,
        shorthand: preset.shorthand,
        mappingMethod: "contrast",
        variations: null,
      };
      return { projectStore: { ...s.projectStore, roles: [...s.projectStore.roles, role] } };
    });
  },

  addRoleWith: (name, shorthand) => {
    set((s) => {
      const role: Role = {
        _id: generateId(),
        name,
        shorthand: shorthand || deriveShorthand(name),
        mappingMethod: "contrast",
        variations: null,
      };
      return { projectStore: { ...s.projectStore, roles: [...s.projectStore.roles, role] } };
    });
  },

  removeRole: (idx) => {
    set((s) => {
      const roles = s.projectStore.roles.filter((_, i) => i !== idx);
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  moveRole: (from, to) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      const [item] = roles.splice(from, 1);
      roles.splice(to, 0, item);
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  setRoleVariation: (roleIdx, varIdx, field, value) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      // Auto-convert from global to custom on first edit
      const base = role.variations ?? (s.projectStore.variations ?? []).map((v) => ({ ...v, _id: generateId() }));
      if (varIdx < 0 || varIdx >= base.length) return s;
      const vars = [...base];
      const val = field === "name" || field === "shorthand" ? normalizeSegment(value) : value;
      const parsed = parseFloat(val);
      vars[varIdx] = { ...vars[varIdx], [field]: field === "target" ? (isNaN(parsed) ? vars[varIdx].target : parsed) : val };
      role.variations = vars;
      roles[roleIdx] = role;
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  addRoleVariation: (roleIdx) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      const base = role.variations ?? (s.projectStore.variations ?? []).map((v) => ({ ...v, _id: generateId() }));
      const newVar: Variation = { _id: generateId(), name: "Variation", shorthand: "", target: 4.5 };
      role.variations = [...base, newVar];
      roles[roleIdx] = role;
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  removeRoleVariation: (roleIdx, varIdx) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      const base = role.variations ?? (s.projectStore.variations ?? []).map((v) => ({ ...v, _id: generateId() }));
      role.variations = base.filter((_, i) => i !== varIdx);
      roles[roleIdx] = role;
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  toggleRoleCustomVariations: (roleIdx) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      const role = { ...roles[roleIdx] };
      if (!role) return s;
      if (role.variations !== null) {
        role.variations = null;
      } else {
        role.variations = (s.projectStore.variations ?? []).map((v) => ({ ...v, _id: generateId() }));
      }
      roles[roleIdx] = role;
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  setRoleScope: (roleIdx, colorIds) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      roles[roleIdx] = { ...roles[roleIdx], scopedColorIds: colorIds };
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  setRoleLocalBg: (roleIdx, localBg) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      roles[roleIdx] = { ...roles[roleIdx], localBg };
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  setRoleScopes: (roleIdx, scopes) => {
    set((s) => {
      const roles = [...s.projectStore.roles];
      roles[roleIdx] = { ...roles[roleIdx], scopes: scopes ?? undefined };
      return { projectStore: { ...s.projectStore, roles } };
    });
  },

  // ── Shared variations ──

  setVariation: (idx, field, value) => {
    set((s) => {
      const variations = [...(s.projectStore.variations ?? [])];
      if (!variations[idx]) return s;
      const val = field === "name" || field === "shorthand" ? normalizeSegment(value) : value;
      const parsed = parseFloat(val);
      variations[idx] = { ...variations[idx], [field]: field === "target" ? (isNaN(parsed) ? variations[idx].target : parsed) : val };
      return { projectStore: { ...s.projectStore, variations } };
    });
  },

  addVariation: () => {
    set((s) => {
      const newVar: Variation = { _id: generateId(), name: "Variation", shorthand: "", target: 4.5 };
      const variations = [...(s.projectStore.variations ?? []), newVar];
      return { projectStore: { ...s.projectStore, variations } };
    });
  },

  removeVariation: (idx) => {
    set((s) => {
      const variations = (s.projectStore.variations ?? []).filter((_, i) => i !== idx);
      return { projectStore: { ...s.projectStore, variations } };
    });
  },

  moveVariation: (from, to) => {
    set((s) => {
      const variations = [...(s.projectStore.variations ?? [])];
      const [item] = variations.splice(from, 1);
      variations.splice(to, 0, item);
      return { projectStore: { ...s.projectStore, variations } };
    });
  },

  // ── Scale step names ──

  setScaleStep: (idx, field, value) => {
    set((s) => {
      const steps = [...(s.projectStore.scaleSteps ?? [])];
      if (!steps[idx]) return s;
      steps[idx] = { ...steps[idx], [field]: value };
      return { projectStore: { ...s.projectStore, scaleSteps: steps } };
    });
  },

  addScaleStep: () => {
    set((s) => {
      const len = Math.max(1, parseInt(s.projectStore.scaleLength as unknown as string) || 23);
      const existing = s.projectStore.scaleSteps ?? [];
      const steps = [...existing];
      while (steps.length < len) steps.push({ _id: generateId(), name: "", shorthand: "", index: steps.length });
      return { projectStore: { ...s.projectStore, scaleSteps: steps.slice(0, len) } };
    });
  },

  removeScaleStep: (idx) => {
    set((s) => {
      const steps = [...(s.projectStore.scaleSteps ?? [])];
      if (steps[idx]) steps[idx] = { ...steps[idx], name: "", shorthand: "" };
      const allEmpty = steps.every((s) => !s.name && !s.shorthand);
      return { projectStore: { ...s.projectStore, scaleSteps: allEmpty ? null : steps } };
    });
  },

  // ── Themes ──

  setTheme: (idx, field, value) => {
    set((s) => {
      const themes = [...s.projectStore.themes];
      if (!themes[idx]) return s;
      const val = field === "bg" ? sanitizeHex(value) : value;
      themes[idx] = { ...themes[idx], [field]: val };
      return { projectStore: { ...s.projectStore, themes } };
    });
  },

  addTheme: () => {
    set((s) => {
      const theme: Theme = { _id: generateId(), name: "Theme", bg: "#FFFFFF" };
      return { projectStore: { ...s.projectStore, themes: [...s.projectStore.themes, theme] } };
    });
  },

  removeTheme: (idx) => {
    set((s) => {
      const themes = s.projectStore.themes.filter((_, i) => i !== idx);
      return { projectStore: { ...s.projectStore, themes } };
    });
  },

  moveTheme: (from, to) => {
    set((s) => {
      const themes = [...s.projectStore.themes];
      const [item] = themes.splice(from, 1);
      themes.splice(to, 0, item);
      return { projectStore: { ...s.projectStore, themes } };
    });
  },

  // ── Versions ──

  versionSaveBlockedReason: () => {
    const { projectStore } = get();
    const versions = projectStore.versions ?? [];
    const snap = snapWithoutVersions(projectStore);
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
    const { projectStore } = get();
    const versions = projectStore.versions ?? [];
    if (versions.length === 0) return null;
    const snap = snapWithoutVersions(projectStore);
    return JSON.stringify(snap) === JSON.stringify(versions[0].state) ? versions[0] : null;
  },

  isDefaultState: () => {
    const { projectStore } = get();
    const snap = snapWithoutVersions(projectStore);
    const boot = snapWithoutVersions(makeBootstrapState());
    return JSON.stringify(stripIds(snap)) === JSON.stringify(stripIds(boot));
  },

  saveVersion: (name, description) => {
    if (!name?.trim()) return false;
    const reason = get().versionSaveBlockedReason();
    if (reason) return false;
    set((s) => {
      const snap = snapWithoutVersions(s.projectStore);
      const versions = [{ _id: generateId(), name: name.trim(), description, createdAt: Date.now(), state: snap }, ...(s.projectStore.versions ?? [])];
      return { projectStore: { ...s.projectStore, versions } };
    });
    return true;
  },

  restoreVersion: (id) => {
    const { projectStore, loadState } = get();
    const v = (projectStore.versions ?? []).find((v) => v._id === id);
    if (!v) return;
    const savedVersions = projectStore.versions;
    loadState(JSON.parse(JSON.stringify(v.state)));
    set((s) => ({ projectStore: { ...s.projectStore, versions: savedVersions } }));
  },

  deleteVersion: (id) => {
    set((s) => ({
      projectStore: {
        ...s.projectStore,
        versions: (s.projectStore.versions ?? []).filter((v) => v._id !== id),
      },
    }));
  },

  // ── Validation ──

  validate: () => validateProjectStore(get().projectStore),
}));
