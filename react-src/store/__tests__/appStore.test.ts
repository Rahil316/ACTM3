import { describe, it, expect, beforeEach } from 'vitest';
import {
  useAppStore,
  generateId,
  ensureIds,
  ensureVariations,
  makeBootstrapState,
  validateState,
  computeHash,
  normalizeSegment,
  segmentDepth,
} from '../appStore';

// Reset store to a fresh bootstrap state before each test
beforeEach(() => {
  const fresh = makeBootstrapState();
  useAppStore.setState({
    appState: fresh,
    savedState: null,
    stateHash: computeHash(fresh),
  });
});

// ── generateId ───────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('produces a string of at least 10 characters', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(10);
  });

  it('produces unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ── ensureIds ────────────────────────────────────────────────────────────────

describe('ensureIds', () => {
  it('assigns _id to entities missing one', () => {
    const state = makeBootstrapState();
    // Strip ids
    state.colors.forEach((c) => delete (c as Partial<typeof c>)._id);
    state.roles.forEach((r)  => delete (r as Partial<typeof r>)._id);
    state.themes.forEach((t) => delete (t as Partial<typeof t>)._id);

    ensureIds(state);

    state.colors.forEach((c) => expect(c._id).toBeTruthy());
    state.roles.forEach((r)  => expect(r._id).toBeTruthy());
    state.themes.forEach((t) => expect(t._id).toBeTruthy());
  });

  it('does not overwrite existing _ids', () => {
    const state = makeBootstrapState();
    const original = state.colors[0]._id;
    ensureIds(state);
    expect(state.colors[0]._id).toBe(original);
  });
});

// ── ensureVariations ─────────────────────────────────────────────────────────

describe('ensureVariations', () => {
  it('creates 5 default variations when variations is null', () => {
    const state = makeBootstrapState();
    state.variations = null;
    ensureVariations(state);
    expect(state.variations).toHaveLength(5);
    expect(state.variations![0].name).toBe('Subtle');
  });

  it('aligns variationTargets length to variations length', () => {
    const state = makeBootstrapState();
    ensureVariations(state);
    state.roles.forEach((r) => {
      expect(r.variationTargets.length).toBe(state.variations!.length);
    });
  });
});

// ── normalizeSegment ─────────────────────────────────────────────────────────

describe('normalizeSegment', () => {
  it('trims whitespace around slashes', () => {
    expect(normalizeSegment('Brand / Primary')).toBe('Brand/Primary');
  });

  it('collapses double slashes', () => {
    expect(normalizeSegment('Brand//Primary')).toBe('Brand/Primary');
  });

  it('strips leading and trailing slashes', () => {
    expect(normalizeSegment('/Primary/')).toBe('Primary');
  });
});

describe('segmentDepth', () => {
  it('returns 1 for a flat name', () => {
    expect(segmentDepth('Primary')).toBe(1);
  });

  it('returns 2 for nested name', () => {
    expect(segmentDepth('Brand/Primary')).toBe(2);
  });
});

// ── setColor ─────────────────────────────────────────────────────────────────

describe('setColor', () => {
  it('updates the name of a color', () => {
    const { setColor } = useAppStore.getState();
    setColor(0, 'name', 'Tomato');
    expect(useAppStore.getState().appState.colors[0].name).toBe('Tomato');
  });

  it('sanitizes the hex value', () => {
    const { setColor } = useAppStore.getState();
    setColor(0, 'value', '#ZZinvalid123');
    const val = useAppStore.getState().appState.colors[0].value;
    expect(/^[#0-9a-fA-F]*$/.test(val)).toBe(true);
  });

  it('normalizes slashes in name', () => {
    const { setColor } = useAppStore.getState();
    setColor(0, 'name', 'Brand / Primary');
    expect(useAppStore.getState().appState.colors[0].name).toBe('Brand/Primary');
  });

  it('does nothing for an out-of-range index', () => {
    const { setColor } = useAppStore.getState();
    const before = useAppStore.getState().appState.colors.length;
    setColor(99, 'name', 'Ghost');
    expect(useAppStore.getState().appState.colors.length).toBe(before);
  });
});

// ── setRole ──────────────────────────────────────────────────────────────────

describe('setRole', () => {
  it('updates role name', () => {
    const { setRole } = useAppStore.getState();
    setRole(0, 'name', 'Headline');
    expect(useAppStore.getState().appState.roles[0].name).toBe('Headline');
  });

  it('clamps minContrast between 1 and 21', () => {
    const { setRole } = useAppStore.getState();
    setRole(0, 'minContrast', '99');
    expect(useAppStore.getState().appState.roles[0].minContrast).toBe(21);
    setRole(0, 'minContrast', '-5');
    expect(useAppStore.getState().appState.roles[0].minContrast).toBe(1);
  });

  it('sets mappingMethod to index', () => {
    const { setRole } = useAppStore.getState();
    setRole(0, 'mappingMethod', 'index');
    expect(useAppStore.getState().appState.roles[0].mappingMethod).toBe('index');
  });

  it('clamps variationTarget in contrast mode to max 21', () => {
    const { setRole } = useAppStore.getState();
    setRole(0, 'mappingMethod', 'contrast');
    setRole(0, 'variationTarget:0', '99');
    expect(useAppStore.getState().appState.roles[0].variationTargets[0]).toBe(21);
  });

  it('clamps variationTarget in index mode to scaleLength-1', () => {
    const { setRole } = useAppStore.getState();
    setRole(0, 'mappingMethod', 'index');
    setRole(0, 'variationTarget:0', '9999');
    const scaleLength = useAppStore.getState().appState.scaleLength;
    expect(useAppStore.getState().appState.roles[0].variationTargets[0]).toBe(scaleLength - 1);
  });
});

// ── setTheme ─────────────────────────────────────────────────────────────────

describe('setTheme', () => {
  it('updates theme name', () => {
    const { setTheme } = useAppStore.getState();
    setTheme(0, 'name', 'Sunrise');
    expect(useAppStore.getState().appState.themes[0].name).toBe('Sunrise');
  });
});

// ── setVariation ─────────────────────────────────────────────────────────────

describe('setVariation', () => {
  it('updates variation name', () => {
    const { setVariation } = useAppStore.getState();
    setVariation(0, 'name', 'Whisper');
    expect(useAppStore.getState().appState.variations![0].name).toBe('Whisper');
  });
});

// ── isDirty / markClean ──────────────────────────────────────────────────────

describe('isDirty / markClean', () => {
  it('is not dirty on fresh state', () => {
    expect(useAppStore.getState().isDirty()).toBe(false);
  });

  it('is dirty after a mutation', () => {
    useAppStore.getState().setColor(0, 'name', 'Changed');
    expect(useAppStore.getState().isDirty()).toBe(true);
  });

  it('is clean after markClean', () => {
    useAppStore.getState().setColor(0, 'name', 'Changed');
    useAppStore.getState().markClean();
    expect(useAppStore.getState().isDirty()).toBe(false);
  });
});

// ── loadState ────────────────────────────────────────────────────────────────

describe('loadState', () => {
  it('merges incoming state and assigns missing _ids', () => {
    const { loadState } = useAppStore.getState();
    const newColors = [{ name: 'Red', shorthand: 'rd', value: '#FF0000', description: '' }];
    loadState({ colors: newColors as never });
    const colors = useAppStore.getState().appState.colors;
    expect(colors[0].name).toBe('Red');
    expect(colors[0]._id).toBeTruthy();
  });

  it('defaults missing mappingMethod to contrast', () => {
    const { loadState } = useAppStore.getState();
    const roles = [{ name: 'Text', shorthand: 'tx', minContrast: 4.5, variationTargets: [4.5] }];
    loadState({ roles: roles as never });
    expect(useAppStore.getState().appState.roles[0].mappingMethod).toBe('contrast');
  });
});

// ── validateState ────────────────────────────────────────────────────────────

describe('validateState', () => {
  it('returns null for valid bootstrap state', () => {
    const state = makeBootstrapState();
    ensureVariations(state);
    expect(validateState(state)).toBeNull();
  });

  it('errors when colors array is empty', () => {
    const state = makeBootstrapState();
    state.colors = [];
    const issues = validateState(state);
    expect(issues).not.toBeNull();
    expect(issues![0]).toMatch(/color/i);
  });

  it('errors when roles array is empty', () => {
    const state = makeBootstrapState();
    state.roles = [];
    const issues = validateState(state);
    expect(issues).not.toBeNull();
    expect(issues![0]).toMatch(/role/i);
  });

  it('catches duplicate color names', () => {
    const state = makeBootstrapState();
    state.colors[1].name = state.colors[0].name;
    const issues = validateState(state);
    expect(issues?.some((i) => i.includes('same name'))).toBe(true);
  });

  it('catches shorthand depth mismatch', () => {
    const state = makeBootstrapState();
    state.colors[0].name = 'Brand/Primary';
    state.colors[0].shorthand = 'flat';
    const issues = validateState(state);
    expect(issues?.some((i) => i.includes('shorthand'))).toBe(true);
  });
});

// ── saveVersion / restoreVersion / deleteVersion ─────────────────────────────

describe('versions', () => {
  it('saves a version and adds it to the front', () => {
    const { setColor, saveVersion } = useAppStore.getState();
    setColor(0, 'name', 'Coral');
    const result = saveVersion('v1', 'first save');
    expect(result).toBe(true);
    expect(useAppStore.getState().appState.versions[0].name).toBe('v1');
  });

  it('blocks saving when state is unchanged (bootstrap)', () => {
    const result = useAppStore.getState().saveVersion('v1', '');
    expect(result).toBe(false);
  });

  it('restores a version and preserves the versions array', () => {
    const { setColor, saveVersion, restoreVersion } = useAppStore.getState();
    setColor(0, 'name', 'Coral');
    saveVersion('v1', '');
    setColor(0, 'name', 'Teal');

    const versionId = useAppStore.getState().appState.versions[0]._id;
    restoreVersion(versionId);

    expect(useAppStore.getState().appState.colors[0].name).toBe('Coral');
    expect(useAppStore.getState().appState.versions.length).toBeGreaterThan(0);
  });

  it('deletes a version by id', () => {
    const { setColor, saveVersion, deleteVersion } = useAppStore.getState();
    setColor(0, 'name', 'Coral');
    saveVersion('v1', '');
    const id = useAppStore.getState().appState.versions[0]._id;
    deleteVersion(id);
    expect(useAppStore.getState().appState.versions).toHaveLength(0);
  });
});
