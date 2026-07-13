// OKLCH conversion + gamut-boundary chroma, backed by culori.
//
// hexToOklch never returns null (falls back to #000000's OKLCH values for
// unparseable input) matching clrEngine.ts's old hexToOklch's actual
// contract — every call site already normalizes hex before calling this, so
// the fallback path is unreachable in practice, but keeping the return type
// non-nullable avoids null-checks at every call site for a case that can't
// happen given how this is actually used.
//
// maxChromaAtLH drops the old _maxChromaAtLH's startC parameter (culori's
// clampChroma finds the true gamut boundary directly, no search-range hint
// needed) — callers that relied on startC as an implicit cap (not just a
// bisection hint) apply that cap explicitly via Math.min at the call site.

import { clampChroma, formatHex, inGamut, oklch } from "culori";

export interface OklchColor {
  L: number;
  C: number;
  H: number;
}

export function hexToOklch(hex: string): OklchColor {
  const c = oklch(hex) ?? oklch("#000000")!;
  return { L: c.l, C: c.c, H: c.h ?? 0 };
}

export function oklchToHex(L: number, C: number, H: number): string {
  return formatHex({ mode: "oklch", l: L, c: C, h: H }) ?? "#000000";
}

// Max in-gamut chroma at a given (L, H) — replaces _maxChromaAtLH. culori's
// clampChroma bisects to a true sRGB gamut boundary (fixed 0.0001 epsilon for
// oklch, tighter than the hand-rolled 0.0005), not an approximate/JND-based
// clip, so this is a direct drop-in rather than a looser approximation.
export function maxChromaAtLH(L: number, H: number): number {
  const clamped = clampChroma({ mode: "oklch", l: L, c: 1, h: H }, "oklch");
  return clamped?.c ?? 0;
}

const _inRgbGamut = inGamut("rgb");

export function inGamutOklch(L: number, C: number, H: number): boolean {
  return _inRgbGamut({ mode: "oklch", l: L, c: C, h: H });
}
