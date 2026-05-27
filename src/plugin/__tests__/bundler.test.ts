import { describe, it, expect } from 'vitest';
import { buildExportBundle } from '../exportEng/bundler';
import type { EngineResult, ExportConfig } from '../exportEng/types';

function makeResult(): EngineResult {
  return {
    scales: {
      Blue: {
        '100': { value: '#EFF6FF' },
        '500': { value: '#3B82F6' },
      },
    },
    tokens: {
      light: {
        Blue: {
          0: {
            0: { value: '#3B82F6', tokenRef: 'blue-500' },
          },
        },
      },
      dark: {
        Blue: {
          0: {
            0: { value: '#93C5FD', tokenRef: 'blue-300' },
          },
        },
      },
    },
  };
}

function makeConfig(): ExportConfig {
  return {
    name: 'my-tokens',
    colors: [{ name: 'Blue', shorthand: 'bl' }],
    roles: { 0: { name: 'primary', shorthand: 'pr' } },
    variations: [{ name: 'default', shorthand: 'df' }],
    tokenNameSegments: ['color', 'role', 'variation'],
  };
}

const appState = { name: 'My Tokens' };

describe('buildExportBundle', () => {
  it('returns empty array for empty formats', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), []);
    expect(files).toHaveLength(0);
  });

  it('css: produces scale.css + one file per theme', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['css'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('scale.css'))).toBe(true);
    expect(paths.some((p) => p.endsWith('light.css'))).toBe(true);
    expect(paths.some((p) => p.endsWith('dark.css'))).toBe(true);
    expect(files.every((f) => f.content.length > 0)).toBe(true);
  });

  it('scss: produces _scale.scss, _tokens.scss, index.scss', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['scss'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('_scale.scss'))).toBe(true);
    expect(paths.some((p) => p.endsWith('_tokens.scss'))).toBe(true);
    expect(paths.some((p) => p.endsWith('index.scss'))).toBe(true);
  });

  it('tailwind: produces tailwind.config.js + tokens.css + theme css files', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['tailwind'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('tailwind.config.js'))).toBe(true);
    expect(paths.some((p) => p.endsWith('tokens.css'))).toBe(true);
    expect(paths.some((p) => p.endsWith('light.css'))).toBe(true);
  });

  it('dtcg: produces scale.json + one json per theme', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['dtcg'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('scale.json'))).toBe(true);
    expect(paths.some((p) => p.endsWith('light.json'))).toBe(true);
    expect(paths.some((p) => p.endsWith('dark.json'))).toBe(true);
    // All JSON files should be valid JSON
    for (const f of files) {
      expect(() => JSON.parse(f.content)).not.toThrow();
    }
  });

  it('style-dictionary: produces global.json + one json per theme', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['style-dictionary'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('global.json'))).toBe(true);
    expect(paths.some((p) => p.endsWith('light.json'))).toBe(true);
  });

  it('ios-swift: produces one Swift file per theme', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['ios-swift'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('.swift'))).toBe(true);
    expect(paths.some((p) => p.includes('LightColors.swift'))).toBe(true);
    expect(paths.some((p) => p.includes('DarkColors.swift'))).toBe(true);
  });

  it('android: produces values/colors.xml for first theme, values-X/colors.xml for others', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['android'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.includes('/values/colors.xml'))).toBe(true);
    expect(paths.some((p) => p.includes('/values-dark/colors.xml'))).toBe(true);
  });

  it('rn-ts: produces index.ts + one ts per theme', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['rn-ts'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('index.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('light.ts'))).toBe(true);
    expect(paths.some((p) => p.endsWith('dark.ts'))).toBe(true);
  });

  it('csv: produces a csv file path (content filled by docGen)', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['csv'], appState);
    expect(files.some((f) => f.path.endsWith('.csv'))).toBe(true);
  });

  it('json: produces a json file path (content filled by docGen)', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['json'], appState);
    expect(files.some((f) => f.path.endsWith('-tokens.json'))).toBe(true);
  });

  it('wand: produces .wand file with serialized appState', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['wand'], appState);
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/\.wand$/);
    const parsed = JSON.parse(files[0].content);
    expect(parsed.name).toBe('My Tokens');
  });

  it('multiple formats: returns files for each', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['css', 'scss', 'dtcg'], appState);
    const paths = files.map((f) => f.path);
    expect(paths.some((p) => p.endsWith('scale.css'))).toBe(true);
    expect(paths.some((p) => p.endsWith('_scale.scss'))).toBe(true);
    expect(paths.some((p) => p.includes('dtcg'))).toBe(true);
  });

  it('uses project slug from appState name in paths', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['css'], { name: 'My Cool Project' });
    expect(files[0].path).toContain('my-cool-project');
  });

  it('falls back to config name for project slug when no appState', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['css']);
    expect(files[0].path).toContain('my-tokens');
  });

  it('slugifies project name with special chars', () => {
    const files = buildExportBundle(makeResult(), makeConfig(), ['css'], { name: 'Brand & Co. 2.0' });
    expect(files[0].path).toMatch(/^brand--co-20\//);
  });
});
