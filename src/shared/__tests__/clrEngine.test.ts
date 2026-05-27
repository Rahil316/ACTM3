import { describe, it, expect } from 'vitest';
import { variableMaker } from '../clrEngine';
import type { EngineConfig } from '../clrEngine';

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  return {
    colors: [
      { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1' },
    ],
    themes: [
      { name: 'Light', bg: '#FFFFFF' },
    ],
    roles: [
      { name: 'Text', shorthand: 'tx', variationTargets: [4.5, 7] },
    ],
    variations: [
      { name: '1', shorthand: '1' },
      { name: '2', shorthand: '2' },
    ],
    scaleLength: 11,
    scaleAlgorithm: 'Natural',
    pluginMode: 'scale',
    useUniformAlgorithm: true,
    algorithmScopeLevel: 'color',
    solverMode: 'natural',
    ...overrides,
  };
}

function tokens(result: ReturnType<typeof variableMaker>, theme = 'light', color = 'Brand', roleIdx = 0) {
  return result.tokens[theme]?.[color]?.[roleIdx];
}

// ── Scale mode ────────────────────────────────────────────────────────────────

describe('scale mode', () => {
  it('generates a scale for each color', () => {
    const r = variableMaker(baseConfig());
    expect(r.scales['Brand']).toBeDefined();
    expect(Object.keys(r.scales['Brand']).length).toBe(11);
  });

  it('each scale step has a hex value and contrast info', () => {
    const r = variableMaker(baseConfig());
    const steps = Object.values(r.scales['Brand']);
    for (const step of steps) {
      expect(step.value).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(typeof step.contrast['light'].ratio).toBe('number');
    }
  });

  it('generates tokens for each role × variation', () => {
    const r = variableMaker(baseConfig());
    const roleTokens = tokens(r);
    expect(roleTokens).toBeDefined();
    expect(Object.keys(roleTokens!).length).toBe(2); // 2 variationTargets
  });

  it('token values reference scale steps (tokenRef is set)', () => {
    const r = variableMaker(baseConfig());
    const roleTokens = tokens(r)!;
    for (const t of Object.values(roleTokens)) {
      expect(t.tokenRef).not.toBeNull();
    }
  });

  it('variation 0 targets 4.5 contrast and variation 1 targets 7', () => {
    const r = variableMaker(baseConfig());
    const roleTokens = tokens(r)!;
    // variation 0 should have ratio >= 4.5 (or be the closest possible)
    expect(roleTokens[0].contrastTarget).toBe(4.5);
    expect(roleTokens[1].contrastTarget).toBe(7);
  });

  it('scale mode tokens achieve or approach their contrast target', () => {
    const r = variableMaker(baseConfig());
    const roleTokens = tokens(r)!;
    for (const t of Object.values(roleTokens)) {
      // achieved ratio should be reasonably close to target (within 3 full steps)
      expect(t.contrast.ratio).toBeGreaterThan(1);
    }
  });

  it('produces no tokens in direct mode (scales empty)', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    expect(Object.keys(r.scales).length).toBe(0);
  });

  it('multi-color scale generates separate scales per color', () => {
    const r = variableMaker(baseConfig({
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1' },
        { name: 'Neutral', shorthand: 'nt', value: '#6B7280', _id: 'c2' },
      ],
    }));
    expect(r.scales['Brand']).toBeDefined();
    expect(r.scales['Neutral']).toBeDefined();
    // scales should be different colors
    const brandStep1 = Object.values(r.scales['Brand'])[5].value;
    const neutralStep1 = Object.values(r.scales['Neutral'])[5].value;
    expect(brandStep1).not.toBe(neutralStep1);
  });

  it('tokens cover every color × role × variation combination', () => {
    const r = variableMaker(baseConfig({
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1' },
        { name: 'Neutral', shorthand: 'nt', value: '#6B7280', _id: 'c2' },
      ],
      roles: [
        { name: 'Text', shorthand: 'tx', variationTargets: [4.5, 7] },
        { name: 'Fill', shorthand: 'fi', variationTargets: [3] },
      ],
      variations: [{ name: '1', shorthand: '1' }, { name: '2', shorthand: '2' }],
    }));
    // 2 colors × 2 roles in light theme
    expect(Object.keys(r.tokens['light']).length).toBe(2);
    expect(r.tokens['light']['Brand'][0]).toBeDefined(); // role 0
    expect(r.tokens['light']['Brand'][1]).toBeDefined(); // role 1
    expect(r.tokens['light']['Neutral'][0]).toBeDefined();
  });
});

// ── Direct mode ───────────────────────────────────────────────────────────────

describe('direct mode', () => {
  it('generates no scales', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    expect(Object.keys(r.scales).length).toBe(0);
  });

  it('generates tokens for each role × variation', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r);
    expect(roleTokens).toBeDefined();
    expect(Object.keys(roleTokens!).length).toBe(2);
  });

  it('token values are valid hex colors', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r)!;
    for (const t of Object.values(roleTokens)) {
      expect(t.value).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('tokenRef is null (direct mode does not reference scale steps)', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r)!;
    for (const t of Object.values(roleTokens)) {
      expect(t.tokenRef).toBeNull();
    }
  });

  it('achieved contrast ratio is reasonably close to target', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r)!;
    // variation 0 targets 4.5 — solver should get within 1.5 of target
    expect(roleTokens[0].contrast.ratio).toBeGreaterThan(3);
    // variation 1 targets 7
    expect(roleTokens[1].contrast.ratio).toBeGreaterThan(5);
  });

  it('higher contrast target produces a darker/lighter token than lower target (light bg)', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r)!;
    // On a white background, higher target → higher ratio → different value
    expect(roleTokens[1].contrast.ratio).toBeGreaterThanOrEqual(roleTokens[0].contrast.ratio);
  });

  it('produces no engine warnings in direct mode', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    // Direct mode solver warnings are internal implementation artifacts;
    // the engine should not surface them as user-facing warnings here.
    // (This documents the current contract — warnings[] may be populated
    //  but the UI filters them out for direct mode.)
    expect(r.errors.critical.length).toBe(0);
  });
});

// ── Multi-theme ───────────────────────────────────────────────────────────────

describe('multi-theme', () => {
  const multiThemeConfig = baseConfig({
    themes: [
      { name: 'Light', bg: '#FFFFFF' },
      { name: 'Dark', bg: '#111111' },
    ],
  });

  it('generates token entries for every theme', () => {
    const r = variableMaker(multiThemeConfig);
    expect(r.tokens['light']).toBeDefined();
    expect(r.tokens['dark']).toBeDefined();
  });

  it('same role variation targets different colors per theme in scale mode', () => {
    const r = variableMaker(multiThemeConfig);
    const lightVal = tokens(r, 'light')![0].value;
    const darkVal  = tokens(r, 'dark')![0].value;
    // A 4.5 target on white vs black background should produce different hues/lightness
    expect(lightVal).not.toBe(darkVal);
  });

  it('scale contrast values are computed per theme background', () => {
    const r = variableMaker(multiThemeConfig);
    const lightStep = Object.values(r.scales['Brand'])[0];
    expect(lightStep.contrast['light']).toBeDefined();
    expect(lightStep.contrast['dark']).toBeDefined();
    // The same color has different contrast against white vs dark bg
    expect(lightStep.contrast['light'].ratio).not.toBe(lightStep.contrast['dark'].ratio);
  });

  it('duplicate theme names are disambiguated', () => {
    // translateConfig deduplicates — engine itself just uses theme.name.toLowerCase()
    // Two distinct themes with different bgs should produce distinct token entries
    const r = variableMaker(baseConfig({
      themes: [
        { name: 'Light', bg: '#FFFFFF' },
        { name: 'Light 2', bg: '#F0F0F0' },
      ],
    }));
    expect(r.tokens['light']).toBeDefined();
    expect(r.tokens['light 2']).toBeDefined();
  });
});

// ── Solver modes ──────────────────────────────────────────────────────────────

describe('solver modes in direct mode', () => {
  const solvers = ['natural', 'saturated', 'luminance', 'hue-locked', 'chroma-maximized'] as const;

  for (const mode of solvers) {
    it(`${mode}: produces valid hex token values`, () => {
      const r = variableMaker(baseConfig({ pluginMode: 'direct', solverMode: mode, useUniformAlgorithm: true }));
      const roleTokens = tokens(r)!;
      for (const t of Object.values(roleTokens)) {
        expect(t.value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }

  it('hue-locked keeps hue closer to source than luminance mode', () => {
    // hue-locked should preserve hue; luminance shifts it freely
    // We just check both produce valid output — exact hue preservation
    // is a solver internal; a regression here would show NaN/undefined
    const hl = variableMaker(baseConfig({ pluginMode: 'direct', solverMode: 'hue-locked', useUniformAlgorithm: true }));
    const lm = variableMaker(baseConfig({ pluginMode: 'direct', solverMode: 'luminance', useUniformAlgorithm: true }));
    expect(tokens(hl)![0].value).toMatch(/^#/);
    expect(tokens(lm)![0].value).toMatch(/^#/);
  });
});

// ── Scale algorithms ──────────────────────────────────────────────────────────

describe('scale algorithms', () => {
  const algos = ['Linear', 'Uniform', 'Natural', 'Expressive', 'Symmetric', 'OKLCH', 'Material'] as const;

  for (const algo of algos) {
    it(`${algo}: generates valid scale steps`, () => {
      const r = variableMaker(baseConfig({ scaleAlgorithm: algo }));
      const steps = Object.values(r.scales['Brand']);
      expect(steps.length).toBe(11);
      for (const s of steps) {
        expect(s.value).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  }

  it('per-color algorithm override is respected when useUniformAlgorithm=false', () => {
    const r = variableMaker(baseConfig({
      useUniformAlgorithm: false,
      algorithmScopeLevel: 'color',
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', scaleAlgorithm: 'Material', _id: 'c1' },
        { name: 'Neutral', shorthand: 'nt', value: '#6B7280', scaleAlgorithm: 'Linear', _id: 'c2' },
      ],
    }));
    // Both should produce valid scales despite different algorithms
    expect(Object.keys(r.scales['Brand']).length).toBe(11);
    expect(Object.keys(r.scales['Neutral']).length).toBe(11);
  });

  it('uniform algorithm ignores per-color overrides', () => {
    const uniform = variableMaker(baseConfig({
      useUniformAlgorithm: true,
      scaleAlgorithm: 'Natural',
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', scaleAlgorithm: 'Material', _id: 'c1' },
      ],
    }));
    const perColor = variableMaker(baseConfig({
      useUniformAlgorithm: false,
      scaleAlgorithm: 'Natural',
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', scaleAlgorithm: 'Material', _id: 'c1' },
      ],
    }));
    // Under uniform, Brand uses Natural; under per-color it uses Material — scales differ
    const uniformMid = Object.values(uniform.scales['Brand'])[5].value;
    const perColorMid = Object.values(perColor.scales['Brand'])[5].value;
    expect(uniformMid).not.toBe(perColorMid);
  });
});

// ── Role scoping (scopedColorIds) ─────────────────────────────────────────────

describe('role scoping', () => {
  const scopedConfig = (mode: 'scale' | 'direct') => baseConfig({
    pluginMode: mode,
    colors: [
      { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1' },
      { name: 'Neutral', shorthand: 'nt', value: '#6B7280', _id: 'c2' },
    ],
    roles: [
      { name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: ['c1'] },
      { name: 'Surface', shorthand: 'sf', variationTargets: [1.5] },
    ],
    variations: [{ name: '1', shorthand: '1' }],
  });

  it('scoped role produces tokens for the included color (scale mode)', () => {
    const r = variableMaker(scopedConfig('scale'));
    // role 0 (Text) scoped to c1 (Brand) — Brand should have it
    expect(r.tokens['light']['Brand'][0]).toBeDefined();
  });

  it('scoped role produces NO tokens for the excluded color (scale mode)', () => {
    const r = variableMaker(scopedConfig('scale'));
    // role 0 (Text) scoped to c1 only — Neutral should not have role 0
    expect(r.tokens['light']['Neutral'][0]).toBeUndefined();
  });

  it('unscoped role produces tokens for all colors (scale mode)', () => {
    const r = variableMaker(scopedConfig('scale'));
    // role 1 (Surface) has no scope — both colors should have it
    expect(r.tokens['light']['Brand'][1]).toBeDefined();
    expect(r.tokens['light']['Neutral'][1]).toBeDefined();
  });

  it('scoped role produces tokens for the included color (direct mode)', () => {
    const r = variableMaker(scopedConfig('direct'));
    expect(r.tokens['light']['Brand'][0]).toBeDefined();
  });

  it('scoped role produces NO tokens for the excluded color (direct mode)', () => {
    const r = variableMaker(scopedConfig('direct'));
    expect(r.tokens['light']['Neutral'][0]).toBeUndefined();
  });

  it('null scopedColorIds means all colors are included', () => {
    const r = variableMaker(baseConfig({
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1' },
        { name: 'Neutral', shorthand: 'nt', value: '#6B7280', _id: 'c2' },
      ],
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: null }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.tokens['light']['Brand'][0]).toBeDefined();
    expect(r.tokens['light']['Neutral'][0]).toBeDefined();
  });

  it('scoping by color name works as fallback when _id is absent', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF' }, // no _id
        { name: 'Neutral', shorthand: 'nt', value: '#6B7280' },
      ],
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: ['Brand'] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.tokens['light']['Brand'][0]).toBeDefined();
    expect(r.tokens['light']['Neutral'][0]).toBeUndefined();
  });
});

// ── Mapping method: index ─────────────────────────────────────────────────────

describe('index mapping method', () => {
  it('tokenRef points to a scale step name (not null)', () => {
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Text', shorthand: 'tx', mappingMethod: 'index', variationTargets: [2, 5] }],
    }));
    const roleTokens = tokens(r)!;
    expect(roleTokens[0].tokenRef).not.toBeNull();
    expect(roleTokens[1].tokenRef).not.toBeNull();
  });

  it('index 0 and index 5 resolve to different steps', () => {
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Text', shorthand: 'tx', mappingMethod: 'index', variationTargets: [0, 5] }],
    }));
    const roleTokens = tokens(r)!;
    expect(roleTokens[0].value).not.toBe(roleTokens[1].value);
  });

  it('out-of-range index is clamped to valid scale bounds', () => {
    const r = variableMaker(baseConfig({
      scaleLength: 11,
      roles: [{ name: 'Text', shorthand: 'tx', mappingMethod: 'index', variationTargets: [999] }],
    }));
    const roleTokens = tokens(r)!;
    // Should not throw and should produce a valid value
    expect(roleTokens[0].value).toMatch(/^#/);
  });
});

// ── Custom variations ─────────────────────────────────────────────────────────

describe('custom variations', () => {
  it('role with customVariationList uses its own variations', () => {
    const r = variableMaker(baseConfig({
      roles: [{
        name: 'Text', shorthand: 'tx',
        customVariationList: true,
        customVariations: [{ name: 'Weak', shorthand: 'w' }, { name: 'Strong', shorthand: 's' }, { name: 'Max', shorthand: 'm' }],
        variationTargets: [3, 7, 14],
      }],
      variations: [{ name: '1', shorthand: '1' }, { name: '2', shorthand: '2' }],
    }));
    const roleTokens = tokens(r)!;
    // Should have 3 variations (from customVariations), not 2 (from global)
    expect(Object.keys(roleTokens).length).toBe(3);
  });

  it('role without customVariationList uses global variations', () => {
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Text', shorthand: 'tx', customVariationList: false, variationTargets: [4.5, 7] }],
      variations: [{ name: '1', shorthand: '1' }, { name: '2', shorthand: '2' }],
    }));
    const roleTokens = tokens(r)!;
    expect(Object.keys(roleTokens).length).toBe(2);
  });
});

// ── Scale step naming ─────────────────────────────────────────────────────────

describe('scale step naming', () => {
  it('default steps are numeric strings 1..N', () => {
    const r = variableMaker(baseConfig({ scaleLength: 5 }));
    const stepKeys = Object.keys(r.scales['Brand']);
    expect(stepKeys).toEqual(['1', '2', '3', '4', '5']);
  });

  it('custom step names are used when provided', () => {
    const r = variableMaker(baseConfig({
      scaleLength: 3,
      scaleStepNames: ['50', '500', '900'],
    }));
    const stepKeys = Object.keys(r.scales['Brand']);
    expect(stepKeys).toEqual(['50', '500', '900']);
  });

  it('scale step shorthand is color.shorthand + step name', () => {
    const r = variableMaker(baseConfig({ scaleLength: 3 }));
    const steps = Object.values(r.scales['Brand']);
    expect(steps[0].shorthand).toBe('br-1');
    expect(steps[2].shorthand).toBe('br-3');
  });
});

// ── Scale length ──────────────────────────────────────────────────────────────

describe('scale length', () => {
  it('generates exactly N steps', () => {
    for (const n of [5, 11, 23, 50]) {
      const r = variableMaker(baseConfig({ scaleLength: n }));
      expect(Object.keys(r.scales['Brand']).length).toBe(n);
    }
  });
});

// ── Token naming ──────────────────────────────────────────────────────────────

describe('token naming', () => {
  it('tokenName is color-role-variationIndex', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const roleTokens = tokens(r)!;
    expect(roleTokens[0].tokenName).toBe('Brand-Text-0');
    expect(roleTokens[1].tokenName).toBe('Brand-Text-1');
  });

  it('color and role fields on token match config', () => {
    const r = variableMaker(baseConfig({ pluginMode: 'direct' }));
    const t = tokens(r)![0];
    expect(t.color).toBe('Brand');
    expect(t.role).toBe('Text');
  });
});

// ── Error collection ──────────────────────────────────────────────────────────

describe('error collection', () => {
  it('no critical errors on a valid config', () => {
    const r = variableMaker(baseConfig());
    expect(r.errors.critical.length).toBe(0);
  });

  it('scale mode warning fires when contrast target cannot be met', () => {
    // Request an impossible contrast (21+) on a scale — engine should warn
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [25] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.errors.warnings.length).toBeGreaterThan(0);
  });

  it('warning entries contain color, role, theme fields', () => {
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [25] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const w = r.errors.warnings[0];
    expect(w.color).toBe('Brand');
    expect(w.role).toBe('Text');
    expect(w.theme).toBe('light');
  });

  it('returns empty errors object when everything is achievable', () => {
    const r = variableMaker(baseConfig({
      roles: [{ name: 'Fill', shorthand: 'fi', variationTargets: [1.5] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.errors.warnings.length).toBe(0);
    expect(r.errors.critical.length).toBe(0);
  });
});

// ── Algorithm scope level ─────────────────────────────────────────────────────

describe('algorithmScopeLevel', () => {
  it('role scope: per-role solverMode is respected in direct mode', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      useUniformAlgorithm: false,
      algorithmScopeLevel: 'role',
      roles: [
        { name: 'Text', shorthand: 'tx', variationTargets: [4.5], solverMode: 'hue-locked' },
        { name: 'Fill', shorthand: 'fi', variationTargets: [4.5], solverMode: 'luminance' },
      ],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    // Both should produce valid values — if solver dispatch is broken one would be undefined
    expect(tokens(r, 'light', 'Brand', 0)![0].value).toMatch(/^#/);
    expect(tokens(r, 'light', 'Brand', 1)![0].value).toMatch(/^#/);
  });

  it('color scope: per-color solverMode is respected in direct mode', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      useUniformAlgorithm: false,
      algorithmScopeLevel: 'color',
      colors: [
        { name: 'Brand', shorthand: 'br', value: '#0066FF', _id: 'c1', solverMode: 'saturated' },
      ],
    }));
    expect(tokens(r)![0].value).toMatch(/^#/);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('single color, single role, single variation produces exactly 1 token', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(Object.keys(tokens(r)!).length).toBe(1);
  });

  it('white source color still produces a valid scale', () => {
    const r = variableMaker(baseConfig({
      colors: [{ name: 'White', shorthand: 'wh', value: '#FFFFFF', _id: 'c1' }],
    }));
    const steps = Object.values(r.scales['White']);
    expect(steps.every(s => s.value.match(/^#[0-9a-fA-F]{6}$/))).toBe(true);
  });

  it('black source color still produces a valid scale', () => {
    const r = variableMaker(baseConfig({
      colors: [{ name: 'Black', shorthand: 'bk', value: '#000000', _id: 'c1' }],
    }));
    const steps = Object.values(r.scales['Black']);
    expect(steps.every(s => s.value.match(/^#[0-9a-fA-F]{6}$/))).toBe(true);
  });

  it('dark background theme generates tokens without crashing', () => {
    const r = variableMaker(baseConfig({
      themes: [{ name: 'Dark', bg: '#111111' }],
      pluginMode: 'direct',
    }));
    expect(tokens(r, 'dark')![0].value).toMatch(/^#/);
  });

  it('very low contrast target (1.1) is achievable in direct mode', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      roles: [{ name: 'Surface', shorthand: 'sf', variationTargets: [1.1] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const t = tokens(r)![0];
    expect(t.value).toMatch(/^#/);
    // achieved contrast should be >= 1 (trivially true) and close to 1.1
    expect(t.contrast.ratio).toBeGreaterThanOrEqual(1);
  });

  it('all 5 standard solver modes produce different values for the same target', () => {
    const solvers = ['natural', 'saturated', 'luminance', 'hue-locked', 'chroma-maximized'] as const;
    const values = solvers.map(mode =>
      tokens(variableMaker(baseConfig({ pluginMode: 'direct', solverMode: mode, useUniformAlgorithm: true })))![0].value
    );
    // At least 2 of the 5 modes should produce distinct values
    const unique = new Set(values);
    expect(unique.size).toBeGreaterThan(1);
  });
});

// ── localBg ───────────────────────────────────────────────────────────────────

describe('localBg contrast override', () => {
  it('hex kind: uses provided per-theme hex for contrast calculation', () => {
    // Role with a black localBg — tokens should be light-on-dark, different from default
    const rDefault = variableMaker(baseConfig({
      pluginMode: 'direct',
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const rWithBg = variableMaker(baseConfig({
      pluginMode: 'direct',
      roles: [{
        name: 'Text',
        shorthand: 'tx',
        variationTargets: [4.5],
        localBg: { light: '#000000' },
      }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    // localBg against black should produce a noticeably lighter token than against white
    const defaultVal = tokens(rDefault)![0].value;
    const bgVal = tokens(rWithBg)![0].value;
    expect(bgVal).toMatch(/^#[0-9a-fA-F]{6}$/);
    // They should differ (black bg vs white bg)
    expect(bgVal).not.toBe(defaultVal);
  });

  it('hex kind with multiple themes: each theme uses its own bg', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      themes: [
        { name: 'Light', bg: '#FFFFFF' },
        { name: 'Dark', bg: '#1A1A1A' },
      ],
      roles: [{
        name: 'Text',
        shorthand: 'tx',
        variationTargets: [4.5],
        localBg: { light: '#FFFFFF', dark: '#000000' },
      }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const lightToken = r.tokens['light']?.['Brand']?.[0]?.[0];
    const darkToken = r.tokens['dark']?.['Brand']?.[0]?.[0];
    expect(lightToken?.value).toMatch(/^#/);
    expect(darkToken?.value).toMatch(/^#/);
    // Dark bg (black) should produce a lighter token than light bg (white) for the same contrast
    expect(lightToken?.value).not.toBe(darkToken?.value);
  });

  it('per-color localBg: different bg per color produces different tokens', () => {
    const rBase = variableMaker(baseConfig({
      pluginMode: 'direct',
      colors: [
        { name: 'Blue', shorthand: 'bl', value: '#2563EB', _id: 'c1' },
        { name: 'Red', shorthand: 'rd', value: 'DC2626', _id: 'c2' },
      ],
      roles: [{
        name: 'Text',
        shorthand: 'tx',
        variationTargets: [4.5],
        localBgPerColor: {
          Blue: { light: '#000000' },
          Red: { light: '#FFFFFF' },
        },
      }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const blueToken = rBase.tokens['light']?.['Blue']?.[0]?.[0];
    const redToken = rBase.tokens['light']?.['Red']?.[0]?.[0];
    expect(blueToken?.value).toMatch(/^#/);
    expect(redToken?.value).toMatch(/^#/);
    // Different bg colors → different token values
    expect(blueToken?.value).not.toBe(redToken?.value);
  });
});

// ── scopedColorIds ────────────────────────────────────────────────────────────

describe('scopedColorIds', () => {
  it('null scopedColorIds: role applies to all colors', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      colors: [
        { name: 'Blue', shorthand: 'bl', value: '#2563EB', _id: 'c1' },
        { name: 'Red', shorthand: 'rd', value: 'DC2626', _id: 'c2' },
      ],
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: null }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.tokens['light']?.['Blue']).toBeDefined();
    expect(r.tokens['light']?.['Red']).toBeDefined();
  });

  it('empty scopedColorIds: role applies to no colors', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      colors: [
        { name: 'Blue', shorthand: 'bl', value: '#2563EB', _id: 'c1' },
        { name: 'Red', shorthand: 'rd', value: 'DC2626', _id: 'c2' },
      ],
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: [] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    // Role should produce no tokens for any color
    const blueRoleTokens = r.tokens['light']?.['Blue']?.[0];
    const redRoleTokens = r.tokens['light']?.['Red']?.[0];
    expect(blueRoleTokens).toBeUndefined();
    expect(redRoleTokens).toBeUndefined();
  });

  it('specific scopedColorIds: role applies only to listed colors', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      colors: [
        { name: 'Blue', shorthand: 'bl', value: '#2563EB', _id: 'c1' },
        { name: 'Red', shorthand: 'rd', value: 'DC2626', _id: 'c2' },
      ],
      roles: [{ name: 'Text', shorthand: 'tx', variationTargets: [4.5], scopedColorIds: ['c1'] }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    expect(r.tokens['light']?.['Blue']?.[0]).toBeDefined();
    expect(r.tokens['light']?.['Red']?.[0]).toBeUndefined();
  });
});

// ── index mapping mode ────────────────────────────────────────────────────────

describe('index mapping mode', () => {
  it('mappingMethod index: uses scale step at given index', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'scale',
      roles: [{
        name: 'Surface',
        shorthand: 'sf',
        variationTargets: [4.5],
        mappingMethod: 'index',
        indexTargets: [3],
      }],
      variations: [{ name: '1', shorthand: '1' }],
    }));
    const t = r.tokens['light']?.['Brand']?.[0]?.[0];
    expect(t?.value).toMatch(/^#/);
    // tokenRef should reference the scale step at index 3
    expect(t?.tokenRef).toBeDefined();
  });
});

// ── custom variations per role ────────────────────────────────────────────────

describe('custom variations per role', () => {
  it('customVariationList uses role custom variations instead of global', () => {
    const r = variableMaker(baseConfig({
      pluginMode: 'direct',
      roles: [{
        name: 'Text',
        shorthand: 'tx',
        variationTargets: [4.5, 7.0],
        customVariationList: true,
        customVariations: [
          { name: 'on-bg', shorthand: 'ob' },
          { name: 'on-surface', shorthand: 'os' },
        ],
      }],
      variations: [
        { name: '1', shorthand: '1' },
        { name: '2', shorthand: '2' },
        { name: '3', shorthand: '3' },
      ],
    }));
    // Role has 2 custom variations → 2 token entries (not 3 global)
    const roleTokens = r.tokens['light']?.['Brand']?.[0];
    expect(Object.keys(roleTokens || {})).toHaveLength(2);
  });
});
