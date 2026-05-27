import { describe, it, expect } from 'vitest';
import {
  _slug,
  _camel,
  _snake,
  _hexComponents,
  _splitTokenRef,
  _colorLabel,
  _roleLabel,
  _varLabel,
  _stepLabel,
  _tokenSegments,
  _variationDefs,
} from '../exportEng/helpers';
import type { ExportConfig } from '../exportEng/types';

function baseConfig(): ExportConfig {
  return {
    colors: [
      { name: 'Blue', shorthand: 'bl' },
      { name: 'Red', shorthand: 'rd' },
    ],
    roles: {
      0: { name: 'primary', shorthand: 'pr' },
    },
    variations: [
      { name: 'default', shorthand: 'df' },
      { name: 'subtle', shorthand: 'sb' },
    ],
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,
    scaleStepShorthands: { '100': 'xs', '500': 'md' },
    tokenNameSegments: ['color', 'role', 'variation'],
  };
}

// ── _slug ─────────────────────────────────────────────────────────────────────

describe('_slug', () => {
  it('lowercases and trims', () => {
    expect(_slug('  Blue  ')).toBe('blue');
  });

  it('replaces spaces with hyphens', () => {
    expect(_slug('primary text')).toBe('primary-text');
  });

  it('replaces slashes with hyphens', () => {
    expect(_slug('blue/500')).toBe('blue-500');
  });

  it('strips non-alphanumeric chars', () => {
    expect(_slug('hello@world!')).toBe('helloworld');
  });

  it('collapses multiple hyphens', () => {
    expect(_slug('a--b---c')).toBe('a-b-c');
  });

  it('strips leading/trailing hyphens', () => {
    expect(_slug('-hello-')).toBe('hello');
  });

  it('returns empty string for null/undefined', () => {
    expect(_slug(null)).toBe('');
    expect(_slug(undefined)).toBe('');
  });

  it('handles already-slugged string unchanged', () => {
    expect(_slug('blue-500')).toBe('blue-500');
  });
});

// ── _camel ────────────────────────────────────────────────────────────────────

describe('_camel', () => {
  it('single segment: lowercases', () => {
    expect(_camel(['Hello'])).toBe('hello');
  });

  it('multiple segments: camelCases from second', () => {
    expect(_camel(['primary', 'text', 'default'])).toBe('primaryTextDefault');
  });

  it('handles hyphenated slugs', () => {
    expect(_camel(['blue-scale', 'step-100'])).toBe('blueScaleStep100');
  });
});

// ── _snake ────────────────────────────────────────────────────────────────────

describe('_snake', () => {
  it('joins with underscores', () => {
    expect(_snake(['blue', 'primary', 'default'])).toBe('blue_primary_default');
  });

  it('converts hyphens to underscores', () => {
    expect(_snake(['blue-scale', '100'])).toBe('blue_scale_100');
  });

  it('handles uppercase input', () => {
    expect(_snake(['Blue', 'Primary'])).toBe('blue_primary');
  });
});

// ── _hexComponents ────────────────────────────────────────────────────────────

describe('_hexComponents', () => {
  it('parses a 6-char hex correctly', () => {
    const { r, g, b } = _hexComponents('#3B82F6');
    expect(r).toBe(0x3B);
    expect(g).toBe(0x82);
    expect(b).toBe(0xF6);
  });

  it('parses without # prefix', () => {
    const { r, g, b } = _hexComponents('FF0000');
    expect(r).toBe(255);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('expands 3-char hex', () => {
    const { r, g, b } = _hexComponents('#FFF');
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });

  it('parses black', () => {
    const { r, g, b } = _hexComponents('#000000');
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it('parses white', () => {
    const { r, g, b } = _hexComponents('#FFFFFF');
    expect(r).toBe(255);
    expect(g).toBe(255);
    expect(b).toBe(255);
  });
});

// ── _splitTokenRef ─────────────────────────────────────────────────────────────

describe('_splitTokenRef', () => {
  it('splits on last hyphen', () => {
    const { color, step } = _splitTokenRef('blue-500');
    expect(color).toBe('blue');
    expect(step).toBe('500');
  });

  it('handles multi-segment color', () => {
    const { color, step } = _splitTokenRef('brand-blue-100');
    expect(color).toBe('brand-blue');
    expect(step).toBe('100');
  });
});

// ── _colorLabel ────────────────────────────────────────────────────────────────

describe('_colorLabel', () => {
  it('returns name when shorthand disabled', () => {
    expect(_colorLabel('Blue', baseConfig())).toBe('Blue');
  });

  it('returns shorthand when useShorthandColors enabled and shorthand exists', () => {
    const config = { ...baseConfig(), useShorthandColors: true };
    expect(_colorLabel('Blue', config)).toBe('bl');
  });

  it('falls back to name when shorthand not found', () => {
    const config = { ...baseConfig(), useShorthandColors: true };
    expect(_colorLabel('Green', config)).toBe('Green');
  });
});

// ── _roleLabel ─────────────────────────────────────────────────────────────────

describe('_roleLabel', () => {
  it('returns name when shorthand disabled', () => {
    const role = { name: 'primary', shorthand: 'pr' };
    expect(_roleLabel(role, baseConfig())).toBe('primary');
  });

  it('returns shorthand when useShorthandRoles enabled', () => {
    const config = { ...baseConfig(), useShorthandRoles: true };
    const role = { name: 'primary', shorthand: 'pr' };
    expect(_roleLabel(role, config)).toBe('pr');
  });

  it('falls back to name when no shorthand defined', () => {
    const config = { ...baseConfig(), useShorthandRoles: true };
    const role = { name: 'text' };
    expect(_roleLabel(role, config)).toBe('text');
  });
});

// ── _varLabel ──────────────────────────────────────────────────────────────────

describe('_varLabel', () => {
  it('returns name when shorthand disabled', () => {
    const varDef = { name: 'default', shorthand: 'df' };
    expect(_varLabel(varDef, baseConfig())).toBe('default');
  });

  it('returns shorthand when useShorthandVariations enabled', () => {
    const config = { ...baseConfig(), useShorthandVariations: true };
    const varDef = { name: 'default', shorthand: 'df' };
    expect(_varLabel(varDef, config)).toBe('df');
  });
});

// ── _stepLabel ─────────────────────────────────────────────────────────────────

describe('_stepLabel', () => {
  it('returns stepName when shorthand disabled', () => {
    expect(_stepLabel('100', baseConfig())).toBe('100');
  });

  it('returns shorthand when useShorthandSteps enabled and map has entry', () => {
    const config = { ...baseConfig(), useShorthandSteps: true };
    expect(_stepLabel('100', config)).toBe('xs');
    expect(_stepLabel('500', config)).toBe('md');
  });

  it('falls back to stepName when no shorthand in map', () => {
    const config = { ...baseConfig(), useShorthandSteps: true };
    expect(_stepLabel('900', config)).toBe('900');
  });
});

// ── _tokenSegments ─────────────────────────────────────────────────────────────

describe('_tokenSegments', () => {
  it('default order: color/role/variation', () => {
    const segs = _tokenSegments('Blue', 'primary', 'default', baseConfig());
    expect(segs).toEqual(['Blue', 'primary', 'default']);
  });

  it('custom order: role/color/variation', () => {
    const config = { ...baseConfig(), tokenNameSegments: ['role', 'color', 'variation'] };
    const segs = _tokenSegments('Blue', 'primary', 'default', config);
    expect(segs).toEqual(['primary', 'Blue', 'default']);
  });

  it('custom order: variation/color/role', () => {
    const config = { ...baseConfig(), tokenNameSegments: ['variation', 'color', 'role'] };
    const segs = _tokenSegments('Blue', 'primary', 'default', config);
    expect(segs).toEqual(['default', 'Blue', 'primary']);
  });
});

// ── _variationDefs ─────────────────────────────────────────────────────────────

describe('_variationDefs', () => {
  it('returns config.variations when customVariationList is false', () => {
    const role = { name: 'primary', customVariationList: false };
    const defs = _variationDefs(role, baseConfig());
    expect(defs).toEqual(baseConfig().variations);
  });

  it('returns role custom variations when customVariationList is true and customVariations has entries', () => {
    const customVars = [{ name: 'on-fill', shorthand: 'of' }];
    const role = { name: 'primary', customVariationList: true, customVariations: customVars };
    const defs = _variationDefs(role, baseConfig());
    expect(defs).toEqual(customVars);
  });

  it('falls back to config.variations when customVariationList is true but customVariations is empty', () => {
    const role = { name: 'primary', customVariationList: true, customVariations: [] };
    const defs = _variationDefs(role, baseConfig());
    expect(defs).toEqual(baseConfig().variations);
  });
});
