// HCT (hue, chroma, tone) conversion, backed by a vendored copy of Google's
// own material-color-utilities Hct implementation (./hct-vendor/ — fetched
// verbatim from the published source, not hand-transcribed) rather than the
// npm package itself, so the dependency footprint is just the ~1,500 lines
// this project actually needs (Hct + its CAM16/viewing-conditions/color-util
// dependencies) instead of the whole package (scheme, palettes, quantize,
// score, blend, temperature, dislike — none of which this project uses).
//
// hctToHex here is intentionally simpler than clrEngine.ts's old hctToHex:
// it's a direct, non-searching Hct.from(...).toInt() call, because the
// vendored Hct class does correct, hue-safe tone-solving internally the
// moment .tone/.hue/.chroma is read — there is no need to port (or
// re-invoke per bisection step) the hand-rolled findResultByJ/bisectToLimit
// solver that used to live in clrEngine.ts. That solver existed only
// because the old hexToHct/hctToHex's own inverse-CAM16 math could converge
// to a wrong-hue in-gamut answer; the vendored code doesn't have that
// failure mode (verified directly against the exact seed that broke the
// old code).
//
// lstarFromY is re-exported because callers that need "the tone producing a
// target relative luminance" (e.g. TONAL_SCALE_ALGO.Material) have a direct
// closed-form conversion available (CIE L* <-> Y) instead of needing to
// bisect for it — no risk of crossing the CAM16 chromatic-term pole a wide
// bisection search could hit.

import { Hct } from "./hct-vendor/hct";
export { lstarFromY } from "./hct-vendor/color_utils";

export interface HctColor {
  h: number;
  c: number;
  t: number;
}

function _argbFromHex(hex: string): number {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.replace(/./g, (ch) => ch + ch) : normalized;
  const n = parseInt(full, 16);
  return 0xff000000 | n;
}

function _hexFromArgb(argb: number): string {
  return "#" + (argb & 0xffffff).toString(16).padStart(6, "0");
}

export function hexToHct(hex: string): HctColor {
  const hct = Hct.fromInt(_argbFromHex(hex));
  return { h: hct.hue, c: hct.chroma, t: hct.tone };
}

export function hctToHex(hue: number, chroma: number, tone: number): string {
  return _hexFromArgb(Hct.from(hue, chroma, tone).toInt());
}
