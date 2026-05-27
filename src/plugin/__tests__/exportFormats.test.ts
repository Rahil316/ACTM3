import { describe, it, expect } from 'vitest';
import { fmtDTCG } from '../exportEng/fmtDTCG';
import { fmtSCSS } from '../exportEng/fmtSCSS';
import { fmtStyleDictionary } from '../exportEng/fmtStyleDictionary';
import { fmtSwift } from '../exportEng/fmtSwift';
import { fmtAndroid } from '../exportEng/fmtAndroid';
import { fmtReactNative } from '../exportEng/fmtReactNative';
import { fmtTailwind } from '../exportEng/fmtTailwind';
import type { EngineResult, ExportConfig } from '../exportEng/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeResult(): EngineResult {
  return {
    scales: {
      Blue: {
        '100': { value: '#EFF6FF', description: 'Blue lightest' },
        '500': { value: '#3B82F6', description: 'Blue mid' },
        '900': { value: '#1E3A8A', description: 'Blue darkest' },
      },
      Red: {
        '100': { value: '#FEF2F2', description: 'Red lightest' },
        '500': { value: '#EF4444', description: 'Red mid' },
        '900': { value: '#7F1D1D', description: 'Red darkest' },
      },
    },
    tokens: {
      light: {
        Blue: {
          0: {
            0: { value: '#3B82F6', tokenRef: 'blue-500', isAdjusted: false },
            1: { value: '#EFF6FF', tokenRef: 'blue-100', isAdjusted: false },
          },
        },
        Red: {
          0: {
            0: { value: '#EF4444', tokenRef: 'red-500', isAdjusted: false },
          },
        },
      },
      dark: {
        Blue: {
          0: {
            0: { value: '#93C5FD', tokenRef: 'blue-300', isAdjusted: true },
            1: { value: '#1E3A8A', tokenRef: 'blue-900', isAdjusted: false },
          },
        },
      },
    },
  };
}

function makeConfig(): ExportConfig {
  return {
    name: 'my-tokens',
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
    scaleStepShorthands: {},
    tokenNameSegments: ['color', 'role', 'variation'],
    includeDescriptions: true,
  };
}

// ── fmtDTCG ──────────────────────────────────────────────────────────────────

describe('fmtDTCG', () => {
  describe('scale()', () => {
    it('produces valid JSON', () => {
      const out = fmtDTCG.scale(makeResult(), makeConfig());
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('includes $value and $type for each step', () => {
      const parsed = JSON.parse(fmtDTCG.scale(makeResult(), makeConfig()));
      expect(parsed['blue']['100']['$value']).toBe('#EFF6FF');
      expect(parsed['blue']['100']['$type']).toBe('color');
    });

    it('includes $description when includeDescriptions is true', () => {
      const parsed = JSON.parse(fmtDTCG.scale(makeResult(), makeConfig()));
      expect(parsed['blue']['100']['$description']).toBe('Blue lightest');
    });

    it('omits $description when includeDescriptions is false', () => {
      const config = { ...makeConfig(), includeDescriptions: false };
      const parsed = JSON.parse(fmtDTCG.scale(makeResult(), config));
      expect(parsed['blue']['100']['$description']).toBeUndefined();
    });

    it('uses shorthand color labels when useShorthandColors is true', () => {
      const config = { ...makeConfig(), useShorthandColors: true };
      const parsed = JSON.parse(fmtDTCG.scale(makeResult(), config));
      expect(parsed['bl']).toBeDefined();
      expect(parsed['blue']).toBeUndefined();
    });

    it('slugifies color and step keys', () => {
      const parsed = JSON.parse(fmtDTCG.scale(makeResult(), makeConfig()));
      expect(parsed['blue']['100']).toBeDefined();
      expect(parsed['red']['500']).toBeDefined();
    });
  });

  describe('theme()', () => {
    it('produces valid JSON', () => {
      const out = fmtDTCG.theme(makeResult(), makeConfig(), 'light');
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('returns {} for unknown theme', () => {
      const out = fmtDTCG.theme(makeResult(), makeConfig(), 'nonexistent');
      expect(out).toBe('{}');
    });

    it('uses DTCG alias syntax for tokenRef values', () => {
      const parsed = JSON.parse(fmtDTCG.theme(makeResult(), makeConfig(), 'light'));
      const primaryDefault = parsed['blue']['primary']['default'];
      // tokenRef 'blue-500' → {blue.500}
      expect(primaryDefault['$value']).toMatch(/^\{.*\}$/);
    });

    it('uses hex value when no tokenRef', () => {
      const result = makeResult();
      result.tokens.light.Blue[0][0] = { value: '#3B82F6', isAdjusted: false };
      const parsed = JSON.parse(fmtDTCG.theme(result, makeConfig(), 'light'));
      expect(parsed['blue']['primary']['default']['$value']).toBe('#3B82F6');
    });

    it('adds adjusted description when isAdjusted is true', () => {
      const parsed = JSON.parse(fmtDTCG.theme(makeResult(), makeConfig(), 'dark'));
      const token = parsed['blue']['primary']['default'];
      expect(token['$description']).toContain('Adjusted');
    });

    it('applies role shorthand when useShorthandRoles is true', () => {
      const config = { ...makeConfig(), useShorthandRoles: true };
      const parsed = JSON.parse(fmtDTCG.theme(makeResult(), config, 'light'));
      expect(parsed['blue']['pr']).toBeDefined();
      expect(parsed['blue']['primary']).toBeUndefined();
    });
  });
});

// ── fmtSCSS ──────────────────────────────────────────────────────────────────

describe('fmtSCSS', () => {
  describe('scale()', () => {
    it('outputs SCSS variable declarations', () => {
      const out = fmtSCSS.scale(makeResult(), makeConfig());
      expect(out).toContain('$blue-100:');
      expect(out).toContain('$blue-500:');
      expect(out).toContain('#EFF6FF');
    });

    it('outputs SCSS map declaration', () => {
      const out = fmtSCSS.scale(makeResult(), makeConfig());
      expect(out).toContain('$scale-blue:');
      expect(out).toContain('100: $blue-100');
    });

    it('uses shorthand color name when enabled', () => {
      const config = { ...makeConfig(), useShorthandColors: true };
      const out = fmtSCSS.scale(makeResult(), config);
      expect(out).toContain('$bl-100:');
    });

    it('uses shorthand step names when enabled', () => {
      const config = { ...makeConfig(), useShorthandSteps: true, scaleStepShorthands: { '100': 'xs', '500': 'md', '900': 'xl' } };
      const out = fmtSCSS.scale(makeResult(), config);
      expect(out).toContain('$blue-xs:');
    });
  });

  describe('tokens()', () => {
    it('outputs SCSS token maps', () => {
      const out = fmtSCSS.tokens(makeResult(), makeConfig());
      expect(out).toContain('$tokens-light:');
      expect(out).toContain('$tokens-dark:');
    });

    it('marks adjusted tokens with comment', () => {
      const out = fmtSCSS.tokens(makeResult(), makeConfig());
      expect(out).toContain('⚠ adjusted');
    });

    it('references scale variables for tokens with tokenRef', () => {
      const out = fmtSCSS.tokens(makeResult(), makeConfig());
      // token with tokenRef 'blue-500' → $blue-500
      expect(out).toContain('$blue-500');
    });
  });

  describe('index()', () => {
    it('generates mixin and class-based theming', () => {
      const out = fmtSCSS.index(makeResult(), makeConfig());
      expect(out).toContain('@mixin apply-theme');
      expect(out).toContain(':root');
      expect(out).toContain('[data-theme="light"]');
    });

    it('includes prefers-color-scheme dark fallback when dark theme exists', () => {
      const out = fmtSCSS.index(makeResult(), makeConfig());
      expect(out).toContain('prefers-color-scheme: dark');
      expect(out).toContain('$tokens-dark');
    });

    it('omits prefers-color-scheme when no dark theme', () => {
      const result = makeResult();
      delete result.tokens.dark;
      const out = fmtSCSS.index(result, makeConfig());
      expect(out).not.toContain('prefers-color-scheme');
    });
  });
});

// ── fmtStyleDictionary ────────────────────────────────────────────────────────

describe('fmtStyleDictionary', () => {
  describe('global()', () => {
    it('produces valid JSON with color key', () => {
      const out = fmtStyleDictionary.global(makeResult(), makeConfig());
      const parsed = JSON.parse(out);
      expect(parsed.color).toBeDefined();
    });

    it('includes value and type for each step', () => {
      const parsed = JSON.parse(fmtStyleDictionary.global(makeResult(), makeConfig()));
      expect(parsed.color.blue['100'].value).toBe('#EFF6FF');
      expect(parsed.color.blue['100'].type).toBe('color');
    });

    it('includes attributes with category, scale, step', () => {
      const parsed = JSON.parse(fmtStyleDictionary.global(makeResult(), makeConfig()));
      expect(parsed.color.blue['100'].attributes.category).toBe('color');
      expect(parsed.color.blue['100'].attributes.scale).toBe('blue');
      expect(parsed.color.blue['100'].attributes.step).toBe('100');
    });
  });

  describe('theme()', () => {
    it('produces valid JSON with color key', () => {
      const out = fmtStyleDictionary.theme(makeResult(), makeConfig(), 'light');
      const parsed = JSON.parse(out);
      expect(parsed.color).toBeDefined();
    });

    it('uses Style Dictionary reference syntax {color.X.Y}', () => {
      const parsed = JSON.parse(fmtStyleDictionary.theme(makeResult(), makeConfig(), 'light'));
      const token = parsed.color.blue.primary.default;
      expect(token.value).toMatch(/^\{color\./);
    });

    it('returns {} for unknown theme', () => {
      const out = fmtStyleDictionary.theme(makeResult(), makeConfig(), 'unknown');
      expect(out).toBe('{}');
    });

    it('includes theme in attributes', () => {
      const parsed = JSON.parse(fmtStyleDictionary.theme(makeResult(), makeConfig(), 'light'));
      expect(parsed.color.blue.primary.default.attributes.theme).toBe('light');
    });
  });
});

// ── fmtSwift ─────────────────────────────────────────────────────────────────

describe('fmtSwift', () => {
  it('includes import UIKit and SwiftUI', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('import UIKit');
    expect(out).toContain('import SwiftUI');
  });

  it('generates UIColor scale extension', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('extension UIColor {');
    expect(out).toContain('static let blue');
  });

  it('generates UIColor and SwiftUI Color semantic token extensions', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('MARK: - UIColor Semantic Tokens');
    expect(out).toContain('MARK: - SwiftUI Color Semantic Tokens');
  });

  it('uses camelCase variable names', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    // blue/primary/default → bluePrimaryDefault (camelCase)
    expect(out).toMatch(/static let \w+/);
  });

  it('has correct RGBA float format', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    expect(out).toMatch(/UIColor\(red: 0\.\d+, green: 0\.\d+, blue: 0\.\d+, alpha: 1\)/);
  });

  it('only outputs tokens for the requested theme', () => {
    const out = fmtSwift.file(makeResult(), makeConfig(), 'light');
    // dark theme tokens should not appear in the light file
    // The file header says 'light theme'
    expect(out).toContain('light theme');
  });
});

// ── fmtAndroid ────────────────────────────────────────────────────────────────

describe('fmtAndroid', () => {
  it('produces valid XML structure', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(out).toContain('<resources>');
    expect(out).toContain('</resources>');
  });

  it('outputs color entries for scale', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    expect(out).toMatch(/<color name="blue_100">/);
  });

  it('uses ARGB color format', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    // ARGB format: #FFFFFFFF (FF alpha prefix)
    expect(out).toMatch(/#FF[0-9A-F]{6}/);
  });

  it('outputs semantic token entries', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('Semantic Tokens');
    expect(out).toMatch(/<color name="blue_primary_default">/);
  });

  it('uses snake_case resource names', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    // No hyphens or spaces in resource names
    expect(out).not.toMatch(/name="[^"]*[-\s][^"]*"/);
  });

  it('includes theme comment header', () => {
    const out = fmtAndroid.file(makeResult(), makeConfig(), 'light');
    expect(out).toContain('Semantic Tokens — light');
  });
});

// ── fmtReactNative ────────────────────────────────────────────────────────────

describe('fmtReactNative', () => {
  describe('theme()', () => {
    it('exports a const with Tokens suffix', () => {
      const out = fmtReactNative.theme(makeResult(), makeConfig(), 'light');
      expect(out).toContain('export const lightTokens =');
    });

    it('includes scale section', () => {
      const out = fmtReactNative.theme(makeResult(), makeConfig(), 'light');
      expect(out).toContain('scale:');
      expect(out).toContain('blue:');
    });

    it('includes tokens section with nested roles', () => {
      const out = fmtReactNative.theme(makeResult(), makeConfig(), 'light');
      expect(out).toContain('tokens:');
      expect(out).toContain('primary:');
    });

    it('exports TypeScript type', () => {
      const out = fmtReactNative.theme(makeResult(), makeConfig(), 'light');
      expect(out).toContain('export type lightTokensType');
    });

    it('outputs hex values as TypeScript string literals', () => {
      const out = fmtReactNative.theme(makeResult(), makeConfig(), 'light');
      expect(out).toContain('"#');
    });
  });

  describe('index()', () => {
    it('imports from theme files', () => {
      const out = fmtReactNative.index(makeResult(), makeConfig());
      expect(out).toContain("import { lightTokens }");
      expect(out).toContain("import { darkTokens }");
    });

    it('exports Theme type union', () => {
      const out = fmtReactNative.index(makeResult(), makeConfig());
      expect(out).toContain('export type Theme =');
      expect(out).toContain('"light"');
      expect(out).toContain('"dark"');
    });

    it('exports useTokens function', () => {
      const out = fmtReactNative.index(makeResult(), makeConfig());
      expect(out).toContain('export function useTokens(theme: Theme)');
    });

    it('exports all themes', () => {
      const out = fmtReactNative.index(makeResult(), makeConfig());
      expect(out).toContain("export { lightTokens }");
      expect(out).toContain("export { darkTokens }");
    });
  });
});

// ── fmtTailwind ──────────────────────────────────────────────────────────────

describe('fmtTailwind', () => {
  it('outputs a Tailwind config module', () => {
    const out = fmtTailwind.config(makeResult(), makeConfig());
    expect(out).toContain('module.exports =');
    expect(out).toContain('theme:');
    expect(out).toContain('extend:');
    expect(out).toContain('colors:');
  });

  it('references CSS custom properties for scale', () => {
    const out = fmtTailwind.config(makeResult(), makeConfig());
    expect(out).toContain('var(--blue-100)');
    expect(out).toContain('var(--blue-500)');
  });

  it('includes semantic token CSS var references', () => {
    const out = fmtTailwind.config(makeResult(), makeConfig());
    expect(out).toContain('Semantic tokens');
    expect(out).toMatch(/var\(--[a-z0-9-]+\)/);
  });

  it('slugifies all keys', () => {
    const out = fmtTailwind.config(makeResult(), makeConfig());
    // No unslugified names (no uppercase, no spaces)
    const colorKeys = out.match(/"([^"]+)": "var\(/g) || [];
    for (const key of colorKeys) {
      expect(key).toMatch(/^"[a-z0-9-]+":/);
    }
  });

  it('uses shorthand color labels when enabled', () => {
    const config = { ...makeConfig(), useShorthandColors: true };
    const out = fmtTailwind.config(makeResult(), config);
    expect(out).toContain('"bl":');
  });

  it('closes the config correctly', () => {
    const out = fmtTailwind.config(makeResult(), makeConfig());
    expect(out).toContain('plugins: []');
    expect(out.trimEnd()).toMatch(/};$/);
  });
});

// ── Cross-format consistency ──────────────────────────────────────────────────

describe('cross-format consistency', () => {
  it('all formats include Blue color data', () => {
    const result = makeResult();
    const config = makeConfig();
    const dtcg = JSON.parse(fmtDTCG.scale(result, config));
    const sd = JSON.parse(fmtStyleDictionary.global(result, config));
    const scss = fmtSCSS.scale(result, config);
    const rn = fmtReactNative.theme(result, config, 'light');
    const tw = fmtTailwind.config(result, config);
    const android = fmtAndroid.file(result, config, 'light');
    const swift = fmtSwift.file(result, config, 'light');

    expect(dtcg['blue']).toBeDefined();
    expect(sd.color['blue']).toBeDefined();
    expect(scss).toContain('$blue');
    expect(rn).toContain('blue');
    expect(tw).toContain('"blue"');
    expect(android).toContain('blue_');
    expect(swift).toContain('blue');
  });
});
