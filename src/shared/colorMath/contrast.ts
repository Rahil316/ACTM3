// WCAG contrast + hex primitives, backed by culori.
//
// Mirrors clrUtils.ts's old contrastRatio/relLum signatures exactly,
// including the .toFixed(2) rounding contrastRatio applied — dropping that
// was caught by an end-to-end before/after token diff across every real
// preset (every displayed contrast ratio in the UI would otherwise have
// shown extra unrounded decimal digits). validHex/normalizeHex are simple
// regex/string logic with no real color-space math involved — reimplemented
// here verbatim (not delegated to culori's parser) so this module has no
// behavioral dependency on culori's own hex-parsing leniency (e.g. accepting
// 4/8-digit hex-with-alpha, which the rest of this codebase's convention
// does not).

import { rgb, wcagContrast, wcagLuminance } from "culori";

export function validHex(hex: unknown): hex is string {
  if (typeof hex !== "string") return false;
  return /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex.trim());
}

export function normalizeHex(hex: string): string | null {
  if (!validHex(hex)) return null;
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return "#" + h.toUpperCase();
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  const c = rgb(nhex);
  if (!c) return null;
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
}

export function relLum(hex: string): number | null {
  const nhex = normalizeHex(hex);
  if (!nhex) return null;
  return wcagLuminance(nhex);
}

export function contrastRatio(hex1: string, hex2: string): number | null {
  const n1 = normalizeHex(hex1),
    n2 = normalizeHex(hex2);
  if (!n1 || !n2) return null;
  return Number(wcagContrast(n1, n2).toFixed(2));
}
