// Pure color-value formatting transforms — the "kind" values a valueFormat
// definition (B.4) can select. Self-contained (no dependency on
// src/shared/engine/clrUtils.ts or similar) — fmt-lang's only real
// dependency on the rest of the repo is data/adapter.ts's read of
// src/shared/exportEng/ (see README.md); simple hex/rgba math doesn't need
// reuse from there.

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number; // 0..1
}

function toHex2(n: number): string {
  const s = Math.round(n).toString(16).toUpperCase();
  return s.length === 1 ? "0" + s : s;
}

// Accepts "#RGB", "#RRGGBB", with or without the leading "#".
export function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function toHex(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return "#" + toHex2(r) + toHex2(g) + toHex2(b);
}

// B.4's decided byte order: #RRGGBBAA, alpha LAST — CSS Color Module 4's own
// 8-digit hex convention. Deliberately distinct from argbHex (alpha first).
export function toHexa(hex: string, alpha01: number): string {
  const { r, g, b } = parseHex(hex);
  return "#" + toHex2(r) + toHex2(g) + toHex2(b) + toHex2(alpha01 * 255);
}

// Alpha-first convention (Android-style #AARRGGBB) — deliberately distinct
// from hexa, by name and by byte order, per the plan's B.4.
export function toArgbHex(hex: string, alpha01: number): string {
  const { r, g, b } = parseHex(hex);
  return "#" + toHex2(alpha01 * 255) + toHex2(r) + toHex2(g) + toHex2(b);
}

export function toRgba(hex: string, alpha01: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha01})`;
}

export function toRgbaFromParts(rgba: Rgba): string {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

export function toHsla(hex: string, alpha01: number): string {
  const { r, g, b } = parseHex(hex);
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
      case gf: h = (bf - rf) / d + 2; break;
      case bf: h = (rf - gf) / d + 4; break;
    }
    h /= 6;
  }
  return `hsla(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${alpha01})`;
}
