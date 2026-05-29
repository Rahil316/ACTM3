import { describe, it, expect } from 'vitest';
import { translateConfig, resolveTokenRefBgs, buildVariableRenameMap } from '../config';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function baseState() {
  return {
    name: 'test-project',
    pluginMode: 'scale',
    scaleLength: 11,
    scaleAlgorithm: 'Natural',
    tokenGrouping: 'color',
    tokenNameSegments: ['color', 'role', 'variation'],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,
    includeSourceColors: false,
    alphaValues: '10, 25, 50',
    includeDescriptions: true,
    includeColorScalesCollection: true,
    useUniformAlgorithm: true,
    algorithmScopeLevel: 'color',
    solverMode: 'natural',
    scaleCollectionName: '_scale',
    tokenCollectionName: 'color tokens',
    sourceCollectionName: '_constants',
    colors: [
      { _id: 'c1', name: 'Blue', shorthand: 'bl', value: '2563EB' },
      { _id: 'c2', name: 'Red', shorthand: 'rd', value: 'DC2626' },
    ],
    roles: [
      {
        _id: 'r1',
        name: 'primary',
        shorthand: 'pr',
        minContrast: 4.5,
        mappingMethod: 'contrast',
        variationTargets: [1.5, 3.0, 4.5, 7.0, 12.0],
        scopedColorIds: null,
        localBg: null,
      },
    ],
    themes: [
      { name: 'Light', bg: 'FFFFFF' },
      { name: 'Dark', bg: '000000' },
    ],
    variations: [
      { _id: 'v1', name: 'default', shorthand: 'df' },
      { _id: 'v2', name: 'subtle', shorthand: 'sb' },
      { _id: 'v3', name: 'strong', shorthand: 'st' },
    ],
    scaleStepNames: [],
  };
}

// ── translateConfig ────────────────────────────────────────────────────────────

describe('translateConfig', () => {
  it('passes basic fields through', () => {
    const cfg = translateConfig(baseState());
    expect(cfg.name).toBe('test-project');
    expect(cfg.pluginMode).toBe('scale');
    expect(cfg.scaleLength).toBe(11);
  });

  it('maps colors array correctly', () => {
    const cfg = translateConfig(baseState());
    expect(cfg.colors).toHaveLength(2);
    expect(cfg.colors[0].name).toBe('Blue');
    expect(cfg.colors[0].shorthand).toBe('bl');
    expect(cfg.colors[0].value).toBe('2563EB');
    expect(cfg.colors[0]._id).toBe('c1');
  });

  it('maps roles with all fields', () => {
    const cfg = translateConfig(baseState());
    expect(cfg.roles).toHaveLength(1);
    const role = cfg.roles[0];
    expect(role.name).toBe('primary');
    expect(role.minContrast).toBe(4.5);
    expect(role.mappingMethod).toBe('contrast');
    expect(role.scopedColorIds).toBeNull();
    expect(role.localBg).toBeNull();
    expect(role.localBgTokenRef).toBeNull();
    expect(role.localBgDynamicRef).toBeNull();
  });

  it('deduplicates theme names', () => {
    const state = baseState();
    state.themes = [
      { name: 'Light', bg: 'FFFFFF' },
      { name: 'Light', bg: 'F5F5F5' },
      { name: 'Dark', bg: '000000' },
    ];
    const cfg = translateConfig(state);
    expect(cfg.themes[0].name).toBe('Light');
    expect(cfg.themes[1].name).toBe('Light 2');
    expect(cfg.themes[2].name).toBe('Dark');
  });

  it('pads scaleStepNames when fewer than scaleLength', () => {
    const state = baseState();
    state.scaleStepNames = [
      { name: 'xs', shorthand: 'xs' },
      { name: 'sm', shorthand: 'sm' },
      { name: 'md', shorthand: 'md' },
    ];
    state.scaleLength = 5;
    const cfg = translateConfig(state);
    expect(cfg.scaleStepNames).toHaveLength(5);
    expect(cfg.scaleStepNames[0]).toBe('xs');
    expect(cfg.scaleStepNames[3]).toBe('4'); // padded
    expect(cfg.scaleStepNames[4]).toBe('5'); // padded
  });

  it('builds scaleStepShorthands map', () => {
    const state = baseState();
    state.scaleStepNames = [
      { name: 'xs', shorthand: 'x' },
      { name: 'sm', shorthand: 's' },
    ];
    state.scaleLength = 2;
    const cfg = translateConfig(state);
    expect(cfg.scaleStepShorthands['xs']).toBe('x');
    expect(cfg.scaleStepShorthands['sm']).toBe('s');
  });

  it('parses alphaValues string into number array', () => {
    const state = baseState();
    state.alphaValues = '10, 25, 50, 75, 90';
    const cfg = translateConfig(state);
    expect(cfg.alphaValues).toEqual([10, 25, 50, 75, 90]);
  });

  it('clamps alphaValues to 0-100 range', () => {
    const state = baseState();
    state.alphaValues = '-5, 50, 150';
    const cfg = translateConfig(state);
    expect(cfg.alphaValues).toEqual([0, 50, 100]);
  });

  it('uses shorthand flags correctly', () => {
    const state = baseState();
    state.useShorthandColors = true;
    state.useShorthandRoles = true;
    state.useShorthandVariations = true;
    state.useShorthandSteps = true;
    const cfg = translateConfig(state);
    expect(cfg.useShorthandColors).toBe(true);
    expect(cfg.useShorthandRoles).toBe(true);
    expect(cfg.useShorthandVariations).toBe(true);
    expect(cfg.useShorthandSteps).toBe(true);
  });

  it('falls back to default variations when none provided', () => {
    const state = baseState();
    state.variations = [];
    const cfg = translateConfig(state);
    expect(cfg.variations).toHaveLength(5);
    expect(cfg.variations[0].name).toBe('1');
  });

  it('sets localBg from hex kind', () => {
    const state = baseState();
    state.roles[0].localBg = { kind: 'hex', value: { light: '#FFFFFF', dark: '#000000' } };
    const cfg = translateConfig(state);
    expect(cfg.roles[0].localBg).toEqual({ light: '#FFFFFF', dark: '#000000' });
    expect(cfg.roles[0].localBgTokenRef).toBeNull();
    expect(cfg.roles[0].localBgDynamicRef).toBeNull();
  });

  it('sets localBg from color kind using theme entries', () => {
    const state = baseState();
    state.roles[0].localBg = { kind: 'color', value: 'Blue' };
    const cfg = translateConfig(state);
    // Both themes map to the color's hex value
    expect(cfg.roles[0].localBg).toBeDefined();
    expect(cfg.roles[0].localBg['light']).toBe('2563EB');
    expect(cfg.roles[0].localBg['dark']).toBe('2563EB');
  });

  it('returns null localBg for color kind when color not found', () => {
    const state = baseState();
    state.roles[0].localBg = { kind: 'color', value: 'NonExistent' };
    const cfg = translateConfig(state);
    expect(cfg.roles[0].localBg).toBeNull();
  });

  it('sets localBgTokenRef for token kind (non-dynamic)', () => {
    const state = baseState();
    state.roles[0].localBg = { kind: 'token', value: 'blue/primary/default', dynamic: false };
    const cfg = translateConfig(state);
    expect(cfg.roles[0].localBg).toBeNull();
    expect(cfg.roles[0].localBgTokenRef).toBe('blue/primary/default');
    expect(cfg.roles[0].localBgDynamicRef).toBeNull();
  });

  it('sets localBgDynamicRef for token kind (dynamic)', () => {
    const state = baseState();
    state.roles[0].localBg = { kind: 'token', value: '[color]/fill/default', dynamic: true };
    const cfg = translateConfig(state);
    expect(cfg.roles[0].localBg).toBeNull();
    expect(cfg.roles[0].localBgTokenRef).toBeNull();
    expect(cfg.roles[0].localBgDynamicRef).toBe('[color]/fill/default');
  });

  it('sets scopedColorIds on roles', () => {
    const state = baseState();
    state.roles[0].scopedColorIds = ['c1'];
    const cfg = translateConfig(state);
    expect(cfg.roles[0].scopedColorIds).toEqual(['c1']);
  });

  it('uses custom role variations when customVariationList is true', () => {
    const state = baseState();
    state.roles[0].customVariationList = true;
    state.roles[0].customVariations = [
      { _id: 'cv1', name: 'on-fill', shorthand: 'of' },
    ];
    const cfg = translateConfig(state);
    expect(cfg.roles[0].customVariationList).toBe(true);
    expect(cfg.roles[0].customVariations).toHaveLength(1);
    expect(cfg.roles[0].customVariations[0].name).toBe('on-fill');
  });

  it('tokenNameSegments custom ordering', () => {
    const state = baseState();
    state.tokenNameSegments = ['role', 'color', 'variation'];
    const cfg = translateConfig(state);
    expect(cfg.tokenNameSegments).toEqual(['role', 'color', 'variation']);
  });
});

// ── resolveTokenRefBgs ────────────────────────────────────────────────────────

describe('resolveTokenRefBgs', () => {
  function makeEngineResult(tokens: Record<string, unknown>) {
    return { scales: {}, tokens };
  }

  function makeConfig(roles: unknown[]) {
    return {
      colors: [{ name: 'Blue' }, { name: 'Red' }],
      themes: [{ name: 'Light' }, { name: 'Dark' }],
      roles,
    };
  }

  it('returns false when no token refs present', () => {
    const config = makeConfig([{ name: 'primary', localBgTokenRef: null, localBgDynamicRef: null }]);
    const result = makeEngineResult({ light: { Blue: { 0: { 0: { value: '#fff', tokenName: 'blue/primary/default', role: 'primary' } } } } });
    expect(resolveTokenRefBgs(config, result)).toBe(false);
  });

  it('resolves a fixed token ref to localBg per theme', () => {
    const config = makeConfig([
      { name: 'primary', localBgTokenRef: null, localBgDynamicRef: null },
      { name: 'text', localBgTokenRef: 'blue/primary/default', localBgDynamicRef: null, localBg: null },
    ]);
    const result = makeEngineResult({
      light: { Blue: { 0: { 0: { value: '#2563EB', tokenName: 'blue/primary/default', role: 'primary' } } } },
      dark: { Blue: { 0: { 0: { value: '#1E40AF', tokenName: 'blue/primary/default', role: 'primary' } } } },
    });
    const anyResolved = resolveTokenRefBgs(config, result);
    expect(anyResolved).toBe(true);
    expect(config.roles[1].localBg).toEqual({ light: '#2563EB', dark: '#1E40AF' });
    expect(config.roles[1].localBgTokenRef).toBeNull();
  });

  it('detects cycle: role pointing to token produced by another role with token ref', () => {
    const config = makeConfig([
      { name: 'fill', localBgTokenRef: 'blue/surface/default', localBgDynamicRef: null, localBg: null },
      { name: 'surface', localBgTokenRef: 'blue/fill/default', localBgDynamicRef: null, localBg: null },
    ]);
    const result = makeEngineResult({
      light: {
        Blue: {
          0: { 0: { value: '#fff', tokenName: 'blue/fill/default', role: 'fill' } },
          1: { 0: { value: '#eee', tokenName: 'blue/surface/default', role: 'surface' } },
        },
      },
    });
    // Both roles have tokenRef, so both are tainted — resolution returns null for both
    resolveTokenRefBgs(config, result);
    // Tainted roles should have their refs cleared but localBg remains null
    expect(config.roles[0].localBgTokenRef).toBeNull();
    expect(config.roles[1].localBgTokenRef).toBeNull();
    // Both should still be null since the only matching tokens are produced by tainted roles
    expect(config.roles[0].localBg).toBeNull();
    expect(config.roles[1].localBg).toBeNull();
  });

  it('resolves dynamic ref with [color] placeholder', () => {
    const config = makeConfig([
      { name: 'fill', localBgTokenRef: null, localBgDynamicRef: null },
      { name: 'text', localBgTokenRef: null, localBgDynamicRef: '[color]/fill/default', localBg: null },
    ]);
    const result = makeEngineResult({
      light: {
        Blue: { 0: { 0: { value: '#AABBCC', tokenName: 'blue/fill/default', role: 'fill' } } },
        Red: { 0: { 0: { value: '#DDEE00', tokenName: 'red/fill/default', role: 'fill' } } },
      },
    });
    const anyResolved = resolveTokenRefBgs(config, result);
    expect(anyResolved).toBe(true);
    const textRole = config.roles[1];
    expect(textRole.localBgPerColor).toBeDefined();
    expect(textRole.localBgPerColor['Blue']).toEqual({ light: '#AABBCC' });
    expect(textRole.localBgPerColor['Red']).toEqual({ light: '#DDEE00' });
    expect(textRole.localBgDynamicRef).toBeNull();
  });
});

// ── buildVariableRenameMap ────────────────────────────────────────────────────

describe('buildVariableRenameMap', () => {
  function stateWithColor(colorName: string) {
    return {
      colors: [{ _id: 'c1', name: colorName, shorthand: colorName.substring(0, 2).toLowerCase() }],
      roles: [{ _id: 'r1', name: 'primary', shorthand: 'pr' }],
      themes: [{ name: 'Light', bg: 'FFFFFF' }],
      variations: [{ _id: 'v1', name: 'default', shorthand: 'df' }],
      scaleLength: 3,
      scaleStepNames: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      tokenNameSegments: ['color', 'role', 'variation'],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
    };
  }

  it('returns empty maps when no renames needed', () => {
    const state = stateWithColor('Blue');
    const map = buildVariableRenameMap(state, state);
    expect(Object.keys(map.scale)).toHaveLength(0);
    expect(Object.keys(map.tokens)).toHaveLength(0);
    expect(map.summary.scaleCount).toBe(0);
    expect(map.summary.tokenCount).toBe(0);
  });

  it('detects color rename in scale variables', () => {
    const oldState = stateWithColor('Blue');
    const newState = stateWithColor('Navy');
    newState.colors[0]._id = 'c1'; // same id
    const map = buildVariableRenameMap(oldState, newState);
    expect(map.scale['Blue/a']).toBe('Navy/a');
    expect(map.scale['Blue/b']).toBe('Navy/b');
    expect(map.scale['Blue/c']).toBe('Navy/c');
    expect(map.summary.scaleCount).toBe(3);
  });

  it('detects color rename in token variables', () => {
    const oldState = stateWithColor('Blue');
    const newState = stateWithColor('Navy');
    newState.colors[0]._id = 'c1';
    const map = buildVariableRenameMap(oldState, newState);
    expect(map.tokens['Blue/primary/default']).toBe('Navy/primary/default');
    expect(map.summary.tokenCount).toBe(1);
  });

  it('returns empty maps when states are null', () => {
    const map = buildVariableRenameMap(null, null);
    expect(Object.keys(map.scale)).toHaveLength(0);
    expect(Object.keys(map.tokens)).toHaveLength(0);
  });

  it('generates summary changes for color renames', () => {
    const oldState = stateWithColor('Blue');
    const newState = stateWithColor('Navy');
    newState.colors[0]._id = 'c1';
    const map = buildVariableRenameMap(oldState, newState);
    const colorChange = map.summary.changes.find((c) => c.type === 'color');
    expect(colorChange).toBeDefined();
    expect(colorChange!.from).toBe('Blue');
    expect(colorChange!.to).toBe('Navy');
  });

  it('handles tokenNameSegments reorder as rename', () => {
    const oldState = stateWithColor('Blue');
    const newState = stateWithColor('Blue');
    oldState.tokenNameSegments = ['color', 'role', 'variation'];
    newState.tokenNameSegments = ['role', 'color', 'variation'];
    const map = buildVariableRenameMap(oldState, newState);
    // Old: Blue/primary/default → New: primary/Blue/default
    expect(map.tokens['Blue/primary/default']).toBe('primary/Blue/default');
  });

  it('records a stepNames change in summary when scaleStepNames differ', () => {
    const oldState = stateWithColor('Blue');
    const newState = stateWithColor('Blue');
    oldState.scaleStepNames = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    newState.scaleStepNames = [{ name: 'x' }, { name: 'y' }, { name: 'z' }];
    const map = buildVariableRenameMap(oldState, newState);
    const stepChange = map.summary.changes.find((c) => c.type === 'stepNames');
    expect(stepChange).toBeDefined();
    expect(stepChange!.from).toBe('a,b,c');
    expect(stepChange!.to).toBe('x,y,z');
  });
});
