import { describe, it, expect } from 'vitest';
import {
  normalizeSegment,
  deriveShorthand,
  groupedName,
  segmentDepth,
  syncShorthandToName,
  validateProjectStore,
  generateId,
} from '../../../src/ui/store/projectStore';
import type { ProjectStore } from '../../../src/ui/types/state';

// ── generateId ────────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a non-empty string', () => expect(typeof generateId()).toBe('string'));
  it('generates unique ids', () => expect(generateId()).not.toBe(generateId()));
  it('has reasonable length (8-12 chars)', () => {
    const id = generateId();
    expect(id.length).toBeGreaterThanOrEqual(8);
    expect(id.length).toBeLessThanOrEqual(12);
  });
});

// ── normalizeSegment ──────────────────────────────────────────────────────────

describe('normalizeSegment', () => {
  it('trims whitespace from each segment', () => expect(normalizeSegment(' a / b ')).toBe('a/b'));
  it('collapses double slashes', () => expect(normalizeSegment('a//b')).toBe('a/b'));
  it('removes leading/trailing slashes', () => expect(normalizeSegment('/a/b/')).toBe('a/b'));
  it('passes through a clean segment', () => expect(normalizeSegment('Brand/Primary')).toBe('Brand/Primary'));
  it('returns empty string as-is', () => expect(normalizeSegment('')).toBe(''));
  it('returns falsy values as-is', () => {
    expect(normalizeSegment(null as unknown as string)).toBe(null);
    expect(normalizeSegment(undefined as unknown as string)).toBe(undefined);
  });
  it('returns non-string as-is', () => {
    expect(normalizeSegment(123 as unknown as string)).toBe(123);
  });
});

// ── deriveShorthand ───────────────────────────────────────────────────────────

describe('deriveShorthand', () => {
  it('returns empty string for empty input', () => expect(deriveShorthand('')).toBe(''));
  it('returns empty string for falsy input', () => expect(deriveShorthand(null as unknown as string)).toBe(''));

  it('multi-word: takes initials', () => expect(deriveShorthand('Primary Accent')).toBe('pa'));
  it('multi-word: max 4 chars', () => expect(deriveShorthand('Primary Accent Dark Strong')).toBe('pads'));
  it('multi-word: lowercases', () => expect(deriveShorthand('Brand Color')).toBe('bc'));
  it('multi-word: splits on underscore', () => expect(deriveShorthand('primary_accent')).toBe('pa'));
  it('multi-word: splits on hyphen', () => expect(deriveShorthand('primary-accent')).toBe('pa'));
  it('multi-word: splits on slash', () => expect(deriveShorthand('Brand/Primary')).toBe('bp'));

  it('single word ≤2 chars: returns as-is', () => expect(deriveShorthand('ab')).toBe('ab'));
  it('single word 1 char: returns as-is', () => expect(deriveShorthand('A')).toBe('a'));
  it('single word: uses first char + first consonant', () => expect(deriveShorthand('Button')).toBe('bt'));
  it('single word: skips vowels for second char', () => expect(deriveShorthand('Icon')).toBe('ic'));
  it('single word: falls back to first 2 chars if no consonants', () => {
    // "aeiou" — no consonants in remainder
    expect(deriveShorthand('aeiou')).toBe('ae');
  });
});

// ── groupedName ───────────────────────────────────────────────────────────────

describe('groupedName', () => {
  it('common prefix: nests under Untitled in that prefix', () => {
    expect(groupedName('Brand/Primary', ['Brand/Primary', 'Brand/Accent'])).toBe('Brand/Untitled/Primary');
  });

  it('no common prefix: nests under root Untitled', () => {
    expect(groupedName('Primary', ['Primary', 'Accent'])).toBe('Untitled/Primary');
  });

  it('deeper common prefix', () => {
    expect(groupedName('A/B/C', ['A/B/C', 'A/B/D'])).toBe('A/B/Untitled/C');
  });

  it('partial common prefix stops at divergence', () => {
    expect(groupedName('Brand/Primary', ['Brand/Primary', 'Other/Accent'])).toBe('Untitled/Primary');
  });

  it('uses leaf of itemName', () => {
    expect(groupedName('X/Y/Leaf', ['X/Y/Leaf', 'X/Y/Other'])).toBe('X/Y/Untitled/Leaf');
  });
});

// ── segmentDepth ──────────────────────────────────────────────────────────────

describe('segmentDepth', () => {
  it('returns 1 for a simple name', () => expect(segmentDepth('Primary')).toBe(1));
  it('returns 2 for one nested group', () => expect(segmentDepth('Brand/Primary')).toBe(2));
  it('returns 3 for deeply nested', () => expect(segmentDepth('A/B/C')).toBe(3));
  it('returns 1 for empty string (default)', () => expect(segmentDepth('')).toBe(1));
  it('returns 1 for null (default)', () => expect(segmentDepth(null as unknown as string)).toBe(1));
  it('ignores empty segments from double slashes', () => expect(segmentDepth('a//b')).toBe(2));
});

// ── syncShorthandToName ───────────────────────────────────────────────────────

describe('syncShorthandToName', () => {
  it('returns shorthand unchanged if already in sync (same depth)', () => {
    expect(syncShorthandToName('Primary', 'pr')).toBe('pr');
  });

  it('returns shorthand unchanged for multi-segment match', () => {
    expect(syncShorthandToName('Brand/Primary', 'b/pr')).toBe('b/pr');
  });

  it('derives prefix when name gains a group segment', () => {
    // name has 2 segments, shorthand has 1 — needs prefix derived for "Brand"
    const result = syncShorthandToName('Brand/Primary', 'pr');
    expect(result.split('/').length).toBe(2);
    expect(result.endsWith('/pr')).toBe(true);
  });

  it('strips prefix when name loses a group segment', () => {
    // name has 1 segment, shorthand has 2 — drop prefix
    const result = syncShorthandToName('Primary', 'b/pr');
    expect(result.split('/').length).toBe(1);
    expect(result).toBe('pr');
  });

  it('derives leaf shorthand when shorthand is empty', () => {
    const result = syncShorthandToName('Brand/Primary', '');
    expect(result.split('/').length).toBe(2);
  });
});

// ── validateProjectStore ──────────────────────────────────────────────────────

function makeColor(overrides = {}) {
  return { _id: generateId(), name: 'Primary', shorthand: 'pr', value: '#0066FF', description: '', ...overrides };
}

function makeRole(overrides = {}) {
  return { _id: generateId(), name: 'Text', shorthand: 'tx', mappingMethod: 'contrast' as const, variations: null, ...overrides };
}

function makeVariation(overrides = {}) {
  return { _id: generateId(), name: 'Default', shorthand: 'df', target: 4.5, ...overrides };
}

function makeStore(overrides: Partial<ProjectStore> = {}): ProjectStore {
  return {
    name: 'Test', description: '', versions: [],
    pluginMode: 'scale', scaleAlgorithm: 'Natural', scaleLength: 11,
    useUniformAlgorithm: true, algorithmScopeLevel: 'color', solverMode: 'natural',
    tokenNameSegments: ['color', 'role', 'variation'],
    useShorthandColors: false, useShorthandRoles: false, useShorthandVariations: false, useShorthandSteps: false,
    includeSourceColors: false, sourceCollectionName: '_constants',
    alphaValues: [], includeColorScalesCollection: true, includeDescriptions: false,
    scaleCollectionName: '_scale', tokenCollectionName: 'color tokens',
    scaleSteps: null, variations: [makeVariation()], canEditRoleVariants: false,
    colors: [makeColor()],
    roles: [makeRole()],
    themes: [{ _id: generateId(), name: 'Light', bg: '#FFFFFF' }],
    ...overrides,
  };
}

describe('validateProjectStore', () => {
  it('returns null for a valid store', () => {
    expect(validateProjectStore(makeStore())).toBeNull();
  });

  it('returns error if no colors', () => {
    const result = validateProjectStore(makeStore({ colors: [] }));
    expect(result).not.toBeNull();
    expect(result![0]).toContain('color');
  });

  it('returns error if no roles', () => {
    const result = validateProjectStore(makeStore({ roles: [] }));
    expect(result).not.toBeNull();
    expect(result![0]).toContain('role');
  });

  it('catches empty color name', () => {
    const result = validateProjectStore(makeStore({ colors: [makeColor({ name: '' })] }));
    expect(result).toContain('One or more colors has an empty name.');
  });

  it('catches empty role name', () => {
    const result = validateProjectStore(makeStore({ roles: [makeRole({ name: '' })] }));
    expect(result).toContain('One or more roles has an empty name.');
  });

  it('catches empty variation name', () => {
    const result = validateProjectStore(makeStore({ variations: [makeVariation({ name: '' })] }));
    expect(result).toContain('One or more variations has an empty name.');
  });

  it('catches color shorthand segment mismatch', () => {
    // name is "Brand/Primary" (depth 2), shorthand is "pr" (depth 1)
    const result = validateProjectStore(makeStore({ colors: [makeColor({ name: 'Brand/Primary', shorthand: 'pr' })] }));
    expect(result).not.toBeNull();
    expect(result!.some(i => i.includes('shorthand segments must match'))).toBe(true);
  });

  it('passes when shorthand segments match name segments', () => {
    const result = validateProjectStore(makeStore({ colors: [makeColor({ name: 'Brand/Primary', shorthand: 'b/pr' })] }));
    expect(result).toBeNull();
  });

  it('catches duplicate color names', () => {
    const result = validateProjectStore(makeStore({
      colors: [makeColor({ name: 'Primary' }), makeColor({ name: 'Primary' })],
    }));
    expect(result).toContain('Two or more colors share the same name.');
  });

  it('catches duplicate color shorthands', () => {
    const result = validateProjectStore(makeStore({
      colors: [makeColor({ name: 'Primary', shorthand: 'pr' }), makeColor({ name: 'Secondary', shorthand: 'pr' })],
    }));
    expect(result).toContain('Two or more colors share the same shorthand.');
  });

  it('catches duplicate role names', () => {
    const result = validateProjectStore(makeStore({
      roles: [makeRole({ name: 'Text' }), makeRole({ name: 'Text' })],
    }));
    expect(result).toContain('Two or more roles share the same name.');
  });

  it('catches resolved label duplicates when using shorthands', () => {
    // Two colors with same shorthand — when useShorthandColors=true, they resolve identically
    const result = validateProjectStore(makeStore({
      useShorthandColors: true,
      colors: [makeColor({ name: 'Primary', shorthand: 'pr' }), makeColor({ name: 'Secondary', shorthand: 'pr' })],
    }));
    expect(result).not.toBeNull();
    expect(result!.some(i => i.includes('resolve to the same Figma path'))).toBe(true);
  });

  it('returns null for duplicate shorthands if shorthands are empty', () => {
    // Empty shorthands are filtered out before duplicate check
    const result = validateProjectStore(makeStore({
      colors: [makeColor({ name: 'Primary', shorthand: '' }), makeColor({ name: 'Secondary', shorthand: '' })],
    }));
    expect(result).toBeNull();
  });
});
