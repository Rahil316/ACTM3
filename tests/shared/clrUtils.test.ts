import { describe, it, expect } from 'vitest';
import {
  validHex, normalizeHex, hexToRgb, rgbToHsl, hexToHsl, hexToHue, hexToSat,
  hslToRgb, rgbToHex, hslToHex, srgbLinearize, srgbDelinearize,
  relLum, contrastRatio, contrastRating, shortestHueDiff, seriesMaker, sanitizeHex,
} from '../../src/shared/clrUtils';

// ── validHex ──────────────────────────────────────────────────────────────────

describe('validHex', () => {
  it('accepts 6-char hex with #', () => expect(validHex('#FF0000')).toBe(true));
  it('accepts 6-char hex without #', () => expect(validHex('FF0000')).toBe(true));
  it('accepts 3-char hex with #', () => expect(validHex('#F00')).toBe(true));
  it('accepts 3-char hex without #', () => expect(validHex('F00')).toBe(true));
  it('is case-insensitive', () => expect(validHex('#ff0000')).toBe(true));
  it('trims whitespace', () => expect(validHex(' #FF0000 ')).toBe(true));
  it('rejects 4-char hex', () => expect(validHex('#F00F')).toBe(false));
  it('rejects 5-char hex', () => expect(validHex('#F00FF')).toBe(false));
  it('rejects empty string', () => expect(validHex('')).toBe(false));
  it('rejects non-hex chars', () => expect(validHex('#GGGGGG')).toBe(false));
  it('rejects number', () => expect(validHex(123 as unknown as string)).toBe(false));
  it('rejects null', () => expect(validHex(null as unknown as string)).toBe(false));
  it('rejects undefined', () => expect(validHex(undefined as unknown as string)).toBe(false));
});

// ── normalizeHex ──────────────────────────────────────────────────────────────

describe('normalizeHex', () => {
  it('returns uppercase 6-char with #', () => expect(normalizeHex('#ff0000')).toBe('#FF0000'));
  it('expands 3-char shorthand', () => expect(normalizeHex('#F0A')).toBe('#FF00AA'));
  it('expands 3-char without #', () => expect(normalizeHex('abc')).toBe('#AABBCC'));
  it('passes through 6-char without #', () => expect(normalizeHex('ff0000')).toBe('#FF0000'));
  it('returns null for invalid', () => expect(normalizeHex('xyz')).toBeNull());
  it('returns null for empty string', () => expect(normalizeHex('')).toBeNull());
});

// ── hexToRgb ──────────────────────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('converts red', () => expect(hexToRgb('#FF0000')).toEqual([255, 0, 0]));
  it('converts green', () => expect(hexToRgb('#00FF00')).toEqual([0, 255, 0]));
  it('converts blue', () => expect(hexToRgb('#0000FF')).toEqual([0, 0, 255]));
  it('converts black', () => expect(hexToRgb('#000000')).toEqual([0, 0, 0]));
  it('converts white', () => expect(hexToRgb('#FFFFFF')).toEqual([255, 255, 255]));
  it('accepts 3-char shorthand', () => expect(hexToRgb('#F00')).toEqual([255, 0, 0]));
  it('returns null for invalid', () => expect(hexToRgb('invalid')).toBeNull());
});

// ── rgbToHsl ──────────────────────────────────────────────────────────────────

describe('rgbToHsl', () => {
  it('converts red', () => expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50]));
  it('converts white (achromatic)', () => expect(rgbToHsl(255, 255, 255)).toEqual([0, 0, 100]));
  it('converts black (achromatic)', () => expect(rgbToHsl(0, 0, 0)).toEqual([0, 0, 0]));
  it('converts mid-grey (achromatic)', () => expect(rgbToHsl(128, 128, 128)).toEqual([0, 0, 50]));
  it('converts blue', () => expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50]));
  it('converts green', () => expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50]));
  it('returns null for out-of-range value', () => expect(rgbToHsl(256, 0, 0)).toBeNull());
  it('returns null for negative value', () => expect(rgbToHsl(-1, 0, 0)).toBeNull());
  it('returns null for non-number', () => expect(rgbToHsl('red' as unknown as number, 0, 0)).toBeNull());
});

// ── hexToHsl, hexToHue, hexToSat ──────────────────────────────────────────────

describe('hexToHsl', () => {
  it('converts red', () => expect(hexToHsl('#FF0000')).toEqual([0, 100, 50]));
  it('returns null for invalid', () => expect(hexToHsl('xyz')).toBeNull());
});

describe('hexToHue', () => {
  it('returns hue of red', () => expect(hexToHue('#FF0000')).toBe(0));
  it('returns hue of blue', () => expect(hexToHue('#0000FF')).toBe(240));
  it('returns null for invalid', () => expect(hexToHue('xyz')).toBeNull());
});

describe('hexToSat', () => {
  it('returns 100 for pure red', () => expect(hexToSat('#FF0000')).toBe(100));
  it('returns 0 for grey', () => expect(hexToSat('#808080')).toBe(0));
  it('returns null for invalid', () => expect(hexToSat('xyz')).toBeNull());
});

// ── hslToRgb ──────────────────────────────────────────────────────────────────

describe('hslToRgb', () => {
  it('converts red (h=0)', () => expect(hslToRgb(0, 100, 50)).toEqual([255, 0, 0]));
  it('converts green (h=120)', () => expect(hslToRgb(120, 100, 50)).toEqual([0, 255, 0]));
  it('converts blue (h=240)', () => expect(hslToRgb(240, 100, 50)).toEqual([0, 0, 255]));
  it('converts white (s=0, l=100)', () => expect(hslToRgb(0, 0, 100)).toEqual([255, 255, 255]));
  it('converts black (l=0)', () => expect(hslToRgb(0, 0, 0)).toEqual([0, 0, 0]));
  it('accepts h=360', () => expect(hslToRgb(360, 100, 50)).toEqual([255, 0, 0]));
  it('returns null for h < 0', () => expect(hslToRgb(-1, 100, 50)).toBeNull());
  it('returns null for h > 360', () => expect(hslToRgb(361, 100, 50)).toBeNull());
  it('returns null for s > 100', () => expect(hslToRgb(0, 101, 50)).toBeNull());
  it('returns null for l < 0', () => expect(hslToRgb(0, 100, -1)).toBeNull());
});

// ── rgbToHex ──────────────────────────────────────────────────────────────────

describe('rgbToHex', () => {
  it('converts red', () => expect(rgbToHex(255, 0, 0)).toBe('#FF0000'));
  it('converts black', () => expect(rgbToHex(0, 0, 0)).toBe('#000000'));
  it('converts white', () => expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF'));
  it('returns null for out-of-range', () => expect(rgbToHex(256, 0, 0)).toBeNull());
  it('returns null for negative', () => expect(rgbToHex(-1, 0, 0)).toBeNull());
});

// ── hslToHex round-trip ───────────────────────────────────────────────────────

describe('hslToHex', () => {
  it('round-trips red', () => expect(hslToHex(0, 100, 50)).toBe('#FF0000'));
  it('round-trips white', () => expect(hslToHex(0, 0, 100)).toBe('#FFFFFF'));
  it('returns null for invalid hsl', () => expect(hslToHex(-1, 0, 0)).toBeNull());
});

// ── srgbLinearize / srgbDelinearize ───────────────────────────────────────────

describe('srgbLinearize', () => {
  it('linearizes 0', () => expect(srgbLinearize(0)).toBe(0));
  it('uses low-end formula below threshold (v=255*0.04045≈10.3)', () => {
    const v = 10; // 10/255 ≈ 0.0392 < 0.04045
    expect(srgbLinearize(v)).toBeCloseTo(v / 255 / 12.92, 6);
  });
  it('uses power formula above threshold', () => {
    const v = 128;
    const x = v / 255;
    expect(srgbLinearize(v)).toBeCloseTo(Math.pow((x + 0.055) / 1.055, 2.4), 6);
  });
  it('linearizes 255 to ~1', () => expect(srgbLinearize(255)).toBeCloseTo(1, 4));
});

describe('srgbDelinearize', () => {
  it('delinearizes 0 to 0', () => expect(srgbDelinearize(0)).toBe(0));
  it('delinearizes 1 to 255', () => expect(srgbDelinearize(1)).toBe(255));
  it('clamps negative to 0', () => expect(srgbDelinearize(-1)).toBe(0));
  it('clamps above 1 to 255', () => expect(srgbDelinearize(2)).toBe(255));
});

// ── relLum ────────────────────────────────────────────────────────────────────

describe('relLum', () => {
  it('black has luminance 0', () => expect(relLum('#000000')).toBe(0));
  it('white has luminance ~1', () => expect(relLum('#FFFFFF')).toBeCloseTo(1, 4));
  it('returns null for invalid hex', () => expect(relLum('xyz')).toBeNull());
  it('red has correct luminance (~0.2126)', () => expect(relLum('#FF0000')).toBeCloseTo(0.2126, 3));
});

// ── contrastRatio ─────────────────────────────────────────────────────────────

describe('contrastRatio', () => {
  it('black on white = 21', () => expect(contrastRatio('#000000', '#FFFFFF')).toBe(21));
  it('white on black = 21 (order-independent)', () => expect(contrastRatio('#FFFFFF', '#000000')).toBe(21));
  it('same color = 1', () => expect(contrastRatio('#FF0000', '#FF0000')).toBe(1));
  it('returns null for invalid hex1', () => expect(contrastRatio('xyz', '#FFFFFF')).toBeNull());
  it('returns null for invalid hex2', () => expect(contrastRatio('#000000', 'xyz')).toBeNull());
  it('returns a number rounded to 2 decimal places', () => {
    const ratio = contrastRatio('#777777', '#FFFFFF');
    expect(ratio).not.toBeNull();
    expect(String(ratio!).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

// ── contrastRating ────────────────────────────────────────────────────────────

describe('contrastRating', () => {
  it('black on white = AAA', () => expect(contrastRating('#000000', '#FFFFFF')).toBe('AAA'));
  it('returns AA for ratio ~4.5-7', () => {
    // #767676 on white is approximately 4.54:1
    const rating = contrastRating('#767676', '#FFFFFF');
    expect(['AA', 'AA Large Text']).toContain(rating);
  });
  it('same color = Fail', () => expect(contrastRating('#FFFFFF', '#FFFFFF')).toBe('Fail'));
  it('returns null for invalid hex', () => expect(contrastRating('xyz', '#FFFFFF')).toBeNull());
  it('very similar light colors = Fail', () => expect(contrastRating('#FFFFFF', '#FEFEFE')).toBe('Fail'));
});

// ── shortestHueDiff ───────────────────────────────────────────────────────────

describe('shortestHueDiff', () => {
  it('same hue = 0', () => expect(shortestHueDiff(90, 90)).toBe(0));
  it('positive difference', () => expect(shortestHueDiff(0, 90)).toBe(90));
  it('negative difference', () => expect(shortestHueDiff(90, 0)).toBe(-90));
  it('wraps clockwise: 350 → 10 = 20', () => expect(shortestHueDiff(350, 10)).toBe(20));
  it('wraps counter-clockwise: 10 → 350 = -20', () => expect(shortestHueDiff(10, 350)).toBe(-20));
  it('exactly 180 degrees returns -180 (formula edge case)', () => expect(shortestHueDiff(0, 180)).toBe(-180));
  it('more than 180 takes shortest path', () => expect(shortestHueDiff(0, 270)).toBe(-90));
});

// ── seriesMaker ───────────────────────────────────────────────────────────────

describe('seriesMaker', () => {
  it('returns [1..5] for 5', () => expect(seriesMaker(5)).toEqual([1, 2, 3, 4, 5]));
  it('returns [1] for 1', () => expect(seriesMaker(1)).toEqual([1]));
  it('returns [] for 0', () => expect(seriesMaker(0)).toEqual([]));
  it('returns [] for negative', () => expect(seriesMaker(-1)).toEqual([]));
});

// ── sanitizeHex ───────────────────────────────────────────────────────────────

describe('sanitizeHex', () => {
  it('strips # and non-hex chars', () => expect(sanitizeHex('#ff0000')).toBe('FF0000'));
  it('uppercases', () => expect(sanitizeHex('abc')).toBe('ABC'));
  it('truncates to 6 chars', () => expect(sanitizeHex('AABBCCDD')).toBe('AABBCC'));
  it('strips non-hex letters', () => expect(sanitizeHex('GGHHII')).toBe(''));
  it('handles empty string', () => expect(sanitizeHex('')).toBe(''));
  it('handles mixed valid/invalid', () => expect(sanitizeHex('G1H2I3')).toBe('123'));
});
