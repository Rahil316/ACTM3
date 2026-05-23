import { create } from 'zustand';
import type {
  AppState,
  Color,
  Role,
  Theme,
  Variation,
  ScaleStepName,
  ValidationIssues,
  MappingMethod,
} from '../types/state';

// ── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_VARIATION_TARGETS = [1.5, 3.0, 4.5, 7.0, 12.0];

export const SOLVER_MODE_OPTIONS: [string, string][] = [
  ['natural',          'Balanced'],
  ['saturated',        'Vivid'],
  ['luminance',        'Muted'],
  ['hue-locked',       'Hue Locked'],
  ['chroma-maximized', 'Max Chroma'],
];

export const SCALE_ALGORITHM_OPTIONS = [
  'Natural', 'Uniform', 'Expressive', 'Symmetric', 'OKLCH', 'Material', 'Linear',
] as const;

export const UI_DIMS = {
  defaultWidth: 400,
  defaultHeight: 720,
  minWidth: 400,
  minHeight: 560,
  maxWidth: 1400,
  maxHeight: 1400,
};

// ── Identity helpers ─────────────────────────────────────────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function ensureIds<T extends Partial<AppState>>(state: T): T {
  state.colors?.forEach((c) => { if (!c._id) c._id = generateId(); });
  state.roles?.forEach((r)  => { if (!r._id) r._id = generateId(); });
  state.themes?.forEach((t) => { if (!t._id) t._id = generateId(); });
  return state;
}

// ── Segment helpers ──────────────────────────────────────────────────────────

export function normalizeSegment(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str.split('/').map((s) => s.trim()).filter(Boolean).join('/');
}

export function segmentDepth(str: string): number {
  if (!str || typeof str !== 'string') return 1;
  return str.split('/').filter(Boolean).length;
}

// ── Hex helpers (kept here to avoid circular imports with color engine) ──────

function sanitizeHex(value: string): string {
  return value.replace(/[^0-9a-fA-F#]/g, '').slice(0, 7);
}

function normalizeHex(value: string): string {
  const clean = value.replace(/^#/, '');
  if (clean.length === 3) {
    return '#' + clean.split('').map((c) => c + c).join('');
  }
  return '#' + clean.padEnd(6, '0').slice(0, 6);
}

// ── Bootstrap config ─────────────────────────────────────────────────────────

const DEFAULT_VARIATIONS: Omit<Variation, '_id'>[] = [
  { name: 'Subtle',  shorthand: '1' },
  { name: 'Soft',    shorthand: '2' },
  { name: 'Default', shorthand: '3' },
  { name: 'Strong',  shorthand: '4' },
  { name: 'Bold',    shorthand: '5' },
];

export function makeBootstrapState(): AppState {
  const variations: Variation[] = DEFAULT_VARIATIONS.map((d) => ({
    ...d,
    _id: generateId(),
  }));

  const state: AppState = {
    name: 'Token Wand',
    description: '',
    versions: [],
    pluginMode: 'scale',
    scaleAlgorithm: 'Natural',
    scaleLength: 25,
    useUniformAlgorithm: true,
    algorithmScopeLevel: 'color',
    solverMode: 'natural',
    tokenNameSegments: ['color', 'role', 'variation'],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,
    resolveTokensDirectly: false,
    includeSourceColors: false,
    sourceCollectionName: '_constants',
    includeAlphaTints: false,
    alphaValues: '5, 10, 20, 25, 50, 75, 80, 90, 95',
    tokenGrouping: 'color',
    includeColorScalesCollection: true,
    includeDescriptions: false,
    scaleCollectionName: '_scale',
    tokenCollectionName: 'color tokens',
    scaleStepNames: null,
    variations,
    colors: [
      { _id: generateId(), name: 'Primary', shorthand: 'pr', value: '#0066FF', description: '' },
      { _id: generateId(), name: 'Gray',    shorthand: 'gr', value: '#6B7280', description: '' },
    ],
    roles: [
      { _id: generateId(), name: 'Text',       shorthand: 'tx', minContrast: 4.5, mappingMethod: 'contrast', variationTargets: [3.0, 4.5, 7.0, 10.0, 14.0], customVariationList: false, customVariations: [] },
      { _id: generateId(), name: 'Background', shorthand: 'bg', minContrast: 1.1, mappingMethod: 'contrast', variationTargets: [1.0, 1.05, 1.1, 1.2, 1.35],  customVariationList: false, customVariations: [] },
      { _id: generateId(), name: 'Border',     shorthand: 'bd', minContrast: 2.0, mappingMethod: 'contrast', variationTargets: [1.5, 2.0, 2.5, 3.0, 3.5],    customVariationList: false, customVariations: [] },
    ],
    themes: [
      { _id: generateId(), name: 'Light', bg: '#FFFFFF' },
      { _id: generateId(), name: 'Dark',  bg: '#0F0F0F' },
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
    const roleVars =
      role.customVariationList && role.customVariations?.length
        ? role.customVariations
        : state.variations!;
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
    colors: state.colors.map((c) => ({ name: c.name, shorthand: c.shorthand, value: normalizeHex(c.value || ''), _id: c._id })),
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
    resolveTokensDirectly: state.resolveTokensDirectly,
  });
}

// ── Validation ───────────────────────────────────────────────────────────────

export function validateState(state: AppState): ValidationIssues {
  if (!state.colors || state.colors.length === 0) return ['Add at least one color before running.'];
  if (!state.roles  || state.roles.length  === 0) return ['Add at least one role before running.'];

  const issues: string[] = [];
  const hasDup = (arr: string[]) => new Set(arr).size !== arr.length;
  const activeVariations = state.variations ?? [];

  if (state.colors.some((c) => !c.name?.trim()))
    issues.push('One or more colors has an empty name.');
  if (state.roles.some((r) => !r.name?.trim()))
    issues.push('One or more roles has an empty name.');
  if (activeVariations.some((v) => !v.name?.trim()))
    issues.push('One or more variations has an empty name.');

  for (const c of state.colors) {
    if (c.shorthand && segmentDepth(c.shorthand) !== segmentDepth(c.name))
      issues.push(`Color "${c.name}": shorthand segments must match name segments.`);
  }
  for (const r of state.roles) {
    if (r.shorthand && segmentDepth(r.shorthand) !== segmentDepth(r.name))
      issues.push(`Role "${r.name}": shorthand segments must match name segments.`);
  }
  for (const v of activeVariations) {
    if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name))
      issues.push(`Variation "${v.name}": shorthand segments must match name segments.`);
  }
  for (const r of state.roles) {
    if (!r.customVariationList || !r.customVariations) continue;
    for (const v of r.customVariations) {
      if (v.shorthand && segmentDepth(v.shorthand) !== segmentDepth(v.name))
        issues.push(`Variation "${v.name}" (role "${r.name}"): shorthand segments must match name segments.`);
    }
  }

  const resolvedColorLabels = state.colors.map((c) =>
    (state.useShorthandColors && c.shorthand ? c.shorthand : c.name).toLowerCase()
  );
  if (hasDup(resolvedColorLabels))
    issues.push('Two or more colors resolve to the same Figma path.');

  const resolvedRoleLabels = state.roles.map((r) =>
    (state.useShorthandRoles && r.shorthand ? r.shorthand : r.name).toLowerCase()
  );
  if (hasDup(resolvedRoleLabels))
    issues.push('Two or more roles resolve to the same Figma path.');

  const resolvedVarLabels = activeVariations.map((v) =>
    (state.useShorthandVariations && v.shorthand ? v.shorthand : v.name).toLowerCase()
  );
  if (hasDup(resolvedVarLabels))
    issues.push('Two or more variations resolve to the same Figma path.');

  const colorNames  = state.colors.map((c) => c.name.trim().toLowerCase());
  const colorShorts = state.colors.map((c) => (c.shorthand || '').trim().toLowerCase()).filter(Boolean);
  const roleNames   = state.roles.map((r) => r.name.trim().toLowerCase());
  const roleShorts  = state.roles.map((r) => (r.shorthand || '').trim().toLowerCase()).filter(Boolean);

  if (hasDup(colorNames))  issues.push('Two or more colors share the same name.');
  if (colorShorts.length && hasDup(colorShorts)) issues.push('Two or more colors share the same shorthand.');
  if (hasDup(roleNames))   issues.push('Two or more roles share the same name.');
  if (roleShorts.length && hasDup(roleShorts))   issues.push('Two or more roles share the same shorthand.');

  return issues.length > 0 ? issues : null;
}

// ── Versions helpers ─────────────────────────────────────────────────────────

function stripIds(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripIds);
  if (obj && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as object)) {
      if (k !== '_id') out[k] = stripIds((obj as Record<string, unknown>)[k]);
    }
    return out;
  }
  return obj;
}

function snapWithoutVersions(state: AppState): Omit<AppState, 'versions'> {
  const snap = JSON.parse(JSON.stringify(state)) as AppState;
  delete (snap as Partial<AppState>).versions;
  return snap;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000)    return 'just now';
  if (diff < 3600000)  return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
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

  // Project
  updateProjectName: (value: string) => void;
  updateProjectDescription: (value: string) => void;

  // Colors
  setColor: (idx: number, key: keyof Color | string, value: string) => void;

  // Roles
  setRole: (idx: number, key: keyof Role | string, value: string | MappingMethod) => void;
  setRoleVariation: (roleIdx: number, varIdx: number, field: string, value: string) => void;

  // Shared variations
  setVariation: (idx: number, field: string, value: string) => void;

  // Scale step names
  setScaleStepName: (idx: number, field: 'name' | 'shorthand', value: string) => void;

  // Themes
  setTheme: (idx: number, field: keyof Theme, value: string) => void;

  // Versions
  versionSaveBlockedReason: () => string | null;
  lastSavedVersion: () => AppState['versions'][number] | null;
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
      (next.roles ?? []).forEach((r) => { if (!r.mappingMethod) r.mappingMethod = 'contrast'; });
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
      if (key === 'value') val = sanitizeHex(value);
      if (key === 'name' || key === 'shorthand') val = normalizeSegment(value);
      colors[idx] = { ...colors[idx], [key]: val };
      return { appState: { ...s.appState, colors } };
    });
  },

  // ── Roles ──

  setRole: (idx, key, value) => {
    set((s) => {
      const roles = [...s.appState.roles];
      if (!roles[idx]) return s;
      const role = { ...roles[idx] };

      if (typeof key === 'string' && key.startsWith('variationTarget:')) {
        const vi = parseInt(key.slice('variationTarget:'.length), 10);
        const targets = [...(role.variationTargets ?? [])];
        const isIndex = role.mappingMethod === 'index';
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

      if (key === 'minContrast') {
        let v = parseFloat(value as string);
        if (isNaN(v)) v = 1;
        role.minContrast = Math.max(1, Math.min(21, v));
        roles[idx] = role;
        return { appState: { ...s.appState, roles } };
      }

      if (key === 'mappingMethod') {
        role.mappingMethod = value === 'index' ? 'index' : 'contrast';
        roles[idx] = role;
        return { appState: { ...s.appState, roles } };
      }

      if (key === 'name' || key === 'shorthand') {
        (role as Record<string, unknown>)[key] = normalizeSegment(value as string);
      } else {
        (role as Record<string, unknown>)[key as string] = value;
      }

      roles[idx] = role;
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
      const val = (field === 'name' || field === 'shorthand') ? normalizeSegment(value) : value;
      vars[varIdx] = { ...vars[varIdx], [field]: val };
      role.customVariations = vars;
      roles[roleIdx] = role;
      return { appState: { ...s.appState, roles } };
    });
  },

  // ── Shared variations ──

  setVariation: (idx, field, value) => {
    set((s) => {
      const variations = [...(s.appState.variations ?? [])];
      if (!variations[idx]) return s;
      const val = (field === 'name' || field === 'shorthand') ? normalizeSegment(value) : value;
      variations[idx] = { ...variations[idx], [field]: val };
      return { appState: { ...s.appState, variations } };
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

  // ── Themes ──

  setTheme: (idx, field, value) => {
    set((s) => {
      const themes = [...s.appState.themes];
      if (!themes[idx]) return s;
      const val = field === 'bg' ? sanitizeHex(value) : value;
      themes[idx] = { ...themes[idx], [field]: val };
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
      return 'Nothing to save! Still at square one.';
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
      const versions = [
        { _id: generateId(), name: name.trim(), description, createdAt: Date.now(), state: snap },
        ...(s.appState.versions ?? []),
      ];
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
