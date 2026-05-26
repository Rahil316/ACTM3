/**
 * Output pipeline tests — what actually lands in Figma variable names
 * and export file content when colors/roles use grouped "/" naming.
 *
 * Covers: translateConfig → variableMaker → figmaVars name-building
 *         + helpers (_slug, _tokenSegments, _colorLabel, _roleLabel)
 *         + fmtCSS scale + token output
 */

import { describe, it, expect } from 'vitest';
import { translateConfig } from '../config';
import { variableMaker } from '../../shared/clrEngine';
import {
  _slug,
  _colorLabel,
  _roleLabel,
  _varLabel,
  _tokenSegments,
  _camel,
  _snake,
} from '../exportEng/helpers';
import { fmtCSS } from '../exportEng/fmtCSS';
import type { ExportConfig } from '../exportEng/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAppState(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Project',
    pluginMode: 'scale',
    colors: [
      { _id: 'c1', name: 'Brand/Primary',  shorthand: 'bp', value: '#0066FF', description: '' },
      { _id: 'c2', name: 'Brand/Accent',   shorthand: 'ba', value: '#8B5CF6', description: '' },
      { _id: 'c3', name: 'Neutral/Gray',   shorthand: 'ng', value: '#6B7280', description: '' },
      { _id: 'c4', name: 'Solo',           shorthand: 'sl', value: '#F59E0B', description: '' },
    ],
    roles: [
      { _id: 'r1', name: 'Text/Primary',   shorthand: 'tp', minContrast: 4.5, variationTargets: [4.5, 7],  mappingMethod: 'contrast' },
      { _id: 'r2', name: 'Surface/Subtle', shorthand: 'ss', minContrast: 1.5, variationTargets: [1.5, 2.5], mappingMethod: 'contrast' },
    ],
    themes: [{ _id: 't1', name: 'Light', bg: 'FFFFFF' }, { _id: 't2', name: 'Dark', bg: '111111' }],
    variations: [
      { _id: 'v1', name: 'Default', shorthand: 'df' },
      { _id: 'v2', name: 'Strong',  shorthand: 'str' },
    ],
    scaleLength: 11,
    scaleAlgorithm: 'Natural',
    useUniformAlgorithm: true,
    algorithmScopeLevel: 'color',
    solverMode: 'natural',
    useShorthandColors: false,
    useShorthandRoles: false,
    useShorthandVariations: false,
    useShorthandSteps: false,
    tokenGrouping: 'color',
    tokenNameSegments: ['color', 'role', 'variation'],
    includeDescriptions: false,
    includeColorScalesCollection: true,
    resolveTokensDirectly: false,
    ...overrides,
  };
}

// ── _slug ─────────────────────────────────────────────────────────────────────

describe('_slug', () => {
  it('handles simple lowercase names', () => {
    expect(_slug('brand')).toBe('brand');
  });

  it('lowercases and trims', () => {
    expect(_slug('  Brand  ')).toBe('brand');
  });

  it('converts spaces to hyphens', () => {
    expect(_slug('Brand Primary')).toBe('brand-primary');
  });

  it('converts underscores to hyphens', () => {
    expect(_slug('brand_primary')).toBe('brand-primary');
  });

  it('converts "/" to hyphen — grouped color name', () => {
    expect(_slug('Brand/Primary')).toBe('brand-primary');
  });

  it('converts deep nested "/" to hyphens', () => {
    expect(_slug('Brand/Sub/Tint')).toBe('brand-sub-tint');
  });

  it('does NOT produce double hyphens from consecutive separators', () => {
    expect(_slug('Brand//Primary')).toBe('brand-primary');
    expect(_slug('Brand / Primary')).toBe('brand-primary');
  });

  it('strips leading/trailing hyphens', () => {
    expect(_slug('/Brand/')).toBe('brand');
  });

  it('handles null/undefined safely', () => {
    expect(_slug(null)).toBe('');
    expect(_slug(undefined)).toBe('');
  });

  it('strips special characters that are not alphanumeric or hyphen', () => {
    expect(_slug('Brand@Primary!')).toBe('brandprimary');
  });
});

// ── _camel and _snake with grouped names ─────────────────────────────────────

describe('_camel and _snake with grouped names', () => {
  it('_camel converts grouped color + role + var to camelCase', () => {
    const result = _camel(['Brand/Primary', 'Text/Body', '1']);
    expect(result).toBe('brandPrimaryTextBody1');
  });

  it('_snake converts grouped names to snake_case', () => {
    const result = _snake(['Brand/Primary', 'Text/Body', '1']);
    expect(result).toBe('brand_primary_text_body_1');
  });
});

// ── _colorLabel / _roleLabel with shorthand toggles ──────────────────────────

describe('label helpers', () => {
  const config: ExportConfig = {
    colors: [
      { name: 'Brand/Primary', shorthand: 'bp' },
      { name: 'Neutral/Gray',  shorthand: 'ng' },
    ],
    roles: {
      '0': { name: 'Text/Primary',   shorthand: 'tp' },
      '1': { name: 'Surface/Subtle', shorthand: 'ss' },
    } as unknown as Record<string, import('../exportEng/types').RoleDef>,
    variations: [{ name: 'Default', shorthand: 'df' }],
  };

  it('_colorLabel returns full name when useShorthandColors=false', () => {
    expect(_colorLabel('Brand/Primary', { ...config, useShorthandColors: false })).toBe('Brand/Primary');
  });

  it('_colorLabel returns shorthand when useShorthandColors=true', () => {
    expect(_colorLabel('Brand/Primary', { ...config, useShorthandColors: true })).toBe('bp');
  });

  it('_colorLabel falls back to full name when shorthand is missing', () => {
    expect(_colorLabel('Unknown/Color', { ...config, useShorthandColors: true })).toBe('Unknown/Color');
  });

  it('_roleLabel returns full name when useShorthandRoles=false', () => {
    expect(_roleLabel({ name: 'Text/Primary', shorthand: 'tp' }, { ...config, useShorthandRoles: false })).toBe('Text/Primary');
  });

  it('_roleLabel returns shorthand when useShorthandRoles=true', () => {
    expect(_roleLabel({ name: 'Text/Primary', shorthand: 'tp' }, { ...config, useShorthandRoles: true })).toBe('tp');
  });

  it('_varLabel returns full name when useShorthandVariations=false', () => {
    expect(_varLabel({ name: 'Default', shorthand: 'df' }, { ...config, useShorthandVariations: false })).toBe('Default');
  });

  it('_varLabel returns shorthand when useShorthandVariations=true', () => {
    expect(_varLabel({ name: 'Default', shorthand: 'df' }, { ...config, useShorthandVariations: true })).toBe('df');
  });
});

// ── _tokenSegments: segment order ────────────────────────────────────────────

describe('_tokenSegments order', () => {
  const base: ExportConfig = { tokenNameSegments: ['color', 'role', 'variation'] };

  it('default order is color/role/variation', () => {
    expect(_tokenSegments('Brand/Primary', 'Text/Primary', 'Default', base))
      .toEqual(['Brand/Primary', 'Text/Primary', 'Default']);
  });

  it('role-first order', () => {
    expect(_tokenSegments('Brand/Primary', 'Text/Primary', 'Default', { tokenNameSegments: ['role', 'color', 'variation'] }))
      .toEqual(['Text/Primary', 'Brand/Primary', 'Default']);
  });

  it('omits empty segments', () => {
    expect(_tokenSegments('Brand', '', 'Default', base)).toEqual(['Brand', 'Default']);
  });
});

// ── translateConfig: name passthrough ────────────────────────────────────────

describe('translateConfig name passthrough', () => {
  it('preserves "/" in color names', () => {
    const cfg = translateConfig(makeAppState());
    expect(cfg.colors[0].name).toBe('Brand/Primary');
    expect(cfg.colors[2].name).toBe('Neutral/Gray');
  });

  it('preserves "/" in role names', () => {
    const cfg = translateConfig(makeAppState());
    expect(cfg.roles[0].name).toBe('Text/Primary');
    expect(cfg.roles[1].name).toBe('Surface/Subtle');
  });

  it('passes _id through on colors', () => {
    const cfg = translateConfig(makeAppState());
    expect(cfg.colors[0]._id).toBe('c1');
  });

  it('passes scopedColorIds through on roles', () => {
    const state = makeAppState({
      roles: [
        { _id: 'r1', name: 'Text/Primary', shorthand: 'tp', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast', scopedColorIds: ['c1', 'c2'] },
      ],
    });
    const cfg = translateConfig(state);
    expect(cfg.roles[0].scopedColorIds).toEqual(['c1', 'c2']);
  });

  it('scopedColorIds null passes through as null', () => {
    const state = makeAppState({
      roles: [
        { _id: 'r1', name: 'Text', shorthand: 'tx', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast', scopedColorIds: null },
      ],
    });
    const cfg = translateConfig(state);
    expect(cfg.roles[0].scopedColorIds).toBeNull();
  });

  it('tokenNameSegments default is color/role/variation', () => {
    const cfg = translateConfig(makeAppState({ tokenNameSegments: undefined }));
    expect(cfg.tokenNameSegments).toEqual(['color', 'role', 'variation']);
  });
});

// ── Figma variable name building (via the sync name-building logic) ───────────
// We replicate the figmaVars name-building inline since it runs in the Figma
// sandbox — but the logic is pure string manipulation we can unit-test here.

function buildFigmaTokenName(
  colorName: string,
  roleName: string,
  varShorthand: string,
  order: string[],
  opts: { useShortColor?: boolean; shortColor?: string; useShortRole?: boolean; shortRole?: string } = {},
): string {
  const cLabel = opts.useShortColor && opts.shortColor ? opts.shortColor : colorName;
  const rLabel = opts.useShortRole  && opts.shortRole  ? opts.shortRole  : roleName;
  const segParts: Record<string, string> = { color: cLabel, role: rLabel, variation: varShorthand };
  return order.map((s) => segParts[s] || s).join('/');
}

function buildFigmaScaleName(colorName: string, step: string, useShortColor = false, shortColor = ''): string {
  const cLabel = useShortColor && shortColor ? shortColor : colorName;
  return `${cLabel}/${step}`;
}

describe('Figma variable names — grouped color + role names', () => {
  it('scale variable name uses "/" passthrough — Brand/Primary/5', () => {
    expect(buildFigmaScaleName('Brand/Primary', '5')).toBe('Brand/Primary/5');
  });

  it('scale variable with shorthand uses shorthand/step', () => {
    expect(buildFigmaScaleName('Brand/Primary', '5', true, 'bp')).toBe('bp/5');
  });

  it('token name: color/role/variation order with grouped names', () => {
    const name = buildFigmaTokenName('Brand/Primary', 'Text/Primary', 'df', ['color', 'role', 'variation']);
    expect(name).toBe('Brand/Primary/Text/Primary/df');
  });

  it('token name: role/color/variation order with grouped names', () => {
    const name = buildFigmaTokenName('Brand/Primary', 'Text/Primary', 'df', ['role', 'color', 'variation']);
    expect(name).toBe('Text/Primary/Brand/Primary/df');
  });

  it('token name: shorthand colors/roles collapse nesting', () => {
    const name = buildFigmaTokenName(
      'Brand/Primary', 'Text/Primary', 'df',
      ['color', 'role', 'variation'],
      { useShortColor: true, shortColor: 'bp', useShortRole: true, shortRole: 'tp' },
    );
    expect(name).toBe('bp/tp/df');
  });

  it('flat (non-grouped) name passes through unchanged', () => {
    expect(buildFigmaScaleName('Solo', '3')).toBe('Solo/3');
    expect(buildFigmaTokenName('Solo', 'Surface', '1', ['color', 'role', 'variation'])).toBe('Solo/Surface/1');
  });
});

// ── CSS export: grouped names produce correct CSS custom properties ───────────

describe('CSS export — grouped color/role names', () => {
  function makeExportResult() {
    const state = makeAppState({ pluginMode: 'scale', includeDescriptions: false });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    return { result, cfg };
  }

  it('scale CSS: Brand/Primary steps use "brand-primary-N" custom props', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.scale(result as any, cfg as any);
    // Should contain --brand-primary-1 style props (not --brandprimary-1)
    expect(css).toContain('--brand-primary-');
    expect(css).not.toContain('--brandprimary-');
  });

  it('scale CSS: Neutral/Gray steps use "neutral-gray-N" custom props', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.scale(result as any, cfg as any);
    expect(css).toContain('--neutral-gray-');
    expect(css).not.toContain('--neutralgray-');
  });

  it('scale CSS: flat "Solo" color uses "solo-N" props (no double hyphen)', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.scale(result as any, cfg as any);
    expect(css).toContain('--solo-');
    expect(css).not.toContain('---');
  });

  it('token CSS: Brand/Primary + Text/Primary produces "brand-primary-text-primary-N"', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    expect(css).toContain('--brand-primary-text-primary-');
    expect(css).not.toContain('--brandprimary-');
    expect(css).not.toContain('--brand-primary-textprimary-');
  });

  it('token CSS: Solo + Surface/Subtle produces "solo-surface-subtle-N"', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    expect(css).toContain('--solo-surface-subtle-');
  });

  it('token CSS with shorthand colors: uses shorthand without slash conversion', () => {
    const state = makeAppState({ useShorthandColors: true, useShorthandRoles: true });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    // Shorthand 'bp' for Brand/Primary — should see --bp-tp- style props
    expect(css).toContain('--bp-tp-');
  });

  it('token CSS: role-first segment order produces role-color-var props', () => {
    const state = makeAppState({ tokenNameSegments: ['role', 'color', 'variation'] });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    // role "Text/Primary" comes first → text-primary-brand-primary-
    expect(css).toContain('--text-primary-brand-primary-');
  });

  it('all CSS custom property names are valid (no double hyphens, no trailing hyphens)', () => {
    const { result, cfg } = makeExportResult();
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    const propMatches = css.match(/--[a-z0-9-]+(?=:)/g) || [];
    expect(propMatches.length).toBeGreaterThan(0);
    for (const prop of propMatches) {
      expect(prop).not.toMatch(/--$/);
      expect(prop).not.toMatch(/--[^a-z0-9]/);
    }
  });
});

// ── Direct mode + grouped names ───────────────────────────────────────────────

describe('direct mode with grouped names', () => {
  it('produces tokens for all color × role combinations', () => {
    const state = makeAppState({ pluginMode: 'direct' });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    expect(result.tokens['light']['Brand/Primary']).toBeDefined();
    expect(result.tokens['light']['Neutral/Gray']).toBeDefined();
    expect(result.tokens['light']['Solo']).toBeDefined();
  });

  it('CSS token props in direct mode use correct hyphenated names', () => {
    const state = makeAppState({ pluginMode: 'direct', includeDescriptions: false });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);
    expect(css).toContain('--brand-primary-text-primary-');
    expect(css).not.toContain('--brandprimary-');
  });
});

// ── Role scoping end-to-end through translateConfig ───────────────────────────

describe('role scoping end-to-end', () => {
  it('scoped role missing from excluded color tokens in CSS output', () => {
    const state = makeAppState({
      roles: [
        { _id: 'r1', name: 'Text/Primary', shorthand: 'tp', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast', scopedColorIds: ['c1'] },
        { _id: 'r2', name: 'Surface',      shorthand: 'sf', minContrast: 1.5, variationTargets: [1.5], mappingMethod: 'contrast', scopedColorIds: null },
      ],
    });
    const cfg = translateConfig(state);
    const result = variableMaker(cfg);
    const css = fmtCSS.theme(result as any, cfg as any, 'light', true);

    // Brand/Primary (c1) should have Text/Primary tokens
    expect(css).toContain('--brand-primary-text-primary-');
    // Neutral/Gray (c2) and others NOT c1 should NOT have Text/Primary tokens
    expect(css).not.toContain('--neutral-gray-text-primary-');
    expect(css).not.toContain('--solo-text-primary-');
    // Surface role is unscoped — all colors should have it
    expect(css).toContain('--brand-primary-surface-');
    expect(css).toContain('--neutral-gray-surface-');
    expect(css).toContain('--solo-surface-');
  });
});

// ── Rename map: grouped names round-trip ──────────────────────────────────────

describe('buildVariableRenameMap with grouped names', () => {
  it('detects a color rename from grouped to flat name', async () => {
    const { buildVariableRenameMap } = await import('../config');
    const oldState = makeAppState({
      colors: [{ _id: 'c1', name: 'Brand/Primary', shorthand: 'bp', value: '#0066FF', description: '' }],
      roles:  [{ _id: 'r1', name: 'Text', shorthand: 'tx', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast' }],
    });
    const newState = makeAppState({
      colors: [{ _id: 'c1', name: 'Brand', shorthand: 'bp', value: '#0066FF', description: '' }],
      roles:  [{ _id: 'r1', name: 'Text', shorthand: 'tx', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast' }],
    });
    const map = buildVariableRenameMap(oldState, newState);
    // Scale renames: "Brand/Primary/1" → "Brand/1"
    const scaleEntries = Object.entries(map.scale);
    expect(scaleEntries.length).toBeGreaterThan(0);
    const [oldName, newName] = scaleEntries[0];
    expect(oldName).toContain('Brand/Primary');
    expect(newName).toContain('Brand');
    expect(newName).not.toContain('Primary');
  });

  it('detects a role rename from grouped to flat name', async () => {
    const { buildVariableRenameMap } = await import('../config');
    const oldState = makeAppState({
      colors: [{ _id: 'c1', name: 'Brand', shorthand: 'br', value: '#0066FF', description: '' }],
      roles:  [{ _id: 'r1', name: 'Text/Primary', shorthand: 'tp', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast' }],
    });
    const newState = makeAppState({
      colors: [{ _id: 'c1', name: 'Brand', shorthand: 'br', value: '#0066FF', description: '' }],
      roles:  [{ _id: 'r1', name: 'Text', shorthand: 'tp', minContrast: 4.5, variationTargets: [4.5], mappingMethod: 'contrast' }],
    });
    const map = buildVariableRenameMap(oldState, newState);
    const tokenEntries = Object.entries(map.tokens);
    expect(tokenEntries.length).toBeGreaterThan(0);
    const [oldName, newName] = tokenEntries[0];
    expect(oldName).toContain('Text/Primary');
    expect(newName).toContain('Text');
    expect(newName).not.toContain('Primary');
  });

  it('returns empty maps when nothing changed', async () => {
    const { buildVariableRenameMap } = await import('../config');
    const state = makeAppState();
    const map = buildVariableRenameMap(state, state);
    expect(Object.keys(map.scale).length).toBe(0);
    expect(Object.keys(map.tokens).length).toBe(0);
  });
});
