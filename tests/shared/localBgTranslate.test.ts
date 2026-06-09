import { describe, it, expect } from 'vitest';
import { translateLocalBg } from '../../src/shared/clrUtils';

const COLORS = [
  { name: 'Primary', value: '#0066FF' },
  { name: 'Gray', value: '#808080' },
];

const THEMES = [
  { name: 'Light' },
  { name: 'Dark' },
];

describe('translateLocalBg', () => {
  it('returns all null for null input', () => {
    expect(translateLocalBg(null, COLORS, THEMES)).toEqual({
      localBgResolved: null,
      localBgTokenRef: null,
      localBgDynamicRef: null,
    });
  });

  it('returns all null for undefined input', () => {
    expect(translateLocalBg(undefined, COLORS, THEMES)).toEqual({
      localBgResolved: null,
      localBgTokenRef: null,
      localBgDynamicRef: null,
    });
  });

  it('returns all null for kind=theme', () => {
    expect(translateLocalBg({ kind: 'theme', value: '' }, COLORS, THEMES)).toEqual({
      localBgResolved: null,
      localBgTokenRef: null,
      localBgDynamicRef: null,
    });
  });

  it('kind=hex sets localBgResolved, others null', () => {
    const hexMap = { light: '#ffffff', dark: '#000000' };
    const result = translateLocalBg({ kind: 'hex', value: hexMap as unknown as string }, COLORS, THEMES);
    expect(result.localBgResolved).toEqual(hexMap);
    expect(result.localBgTokenRef).toBeNull();
    expect(result.localBgDynamicRef).toBeNull();
  });

  it('kind=color resolves to theme-keyed map with lowercase keys', () => {
    const result = translateLocalBg({ kind: 'color', value: 'Primary' }, COLORS, THEMES);
    expect(result.localBgResolved).toEqual({ light: '#0066FF', dark: '#0066FF' });
    expect(result.localBgTokenRef).toBeNull();
    expect(result.localBgDynamicRef).toBeNull();
  });

  it('kind=color returns null localBgResolved if color not found', () => {
    const result = translateLocalBg({ kind: 'color', value: 'NonExistent' }, COLORS, THEMES);
    expect(result.localBgResolved).toBeNull();
  });

  it('kind=color uses lowercase theme names as keys', () => {
    const themes = [{ name: 'Light Mode' }, { name: 'DARK' }];
    const result = translateLocalBg({ kind: 'color', value: 'Primary' }, COLORS, themes);
    expect(result.localBgResolved).toHaveProperty('light mode');
    expect(result.localBgResolved).toHaveProperty('dark');
  });

  it('kind=token-static sets localBgTokenRef, others null', () => {
    const result = translateLocalBg({ kind: 'token-static', value: 'primary/text/default' }, COLORS, THEMES);
    expect(result.localBgTokenRef).toBe('primary/text/default');
    expect(result.localBgResolved).toBeNull();
    expect(result.localBgDynamicRef).toBeNull();
  });

  it('kind=token-dynamic sets localBgDynamicRef, others null', () => {
    const result = translateLocalBg({ kind: 'token-dynamic', value: '[color]/text/default' }, COLORS, THEMES);
    expect(result.localBgDynamicRef).toBe('[color]/text/default');
    expect(result.localBgResolved).toBeNull();
    expect(result.localBgTokenRef).toBeNull();
  });
});
