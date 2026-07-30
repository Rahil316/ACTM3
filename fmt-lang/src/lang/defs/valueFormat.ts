// The "valueFormat" definition kind (B.4) — turns a record's raw color
// value (and, for tokens, its alias-vs-literal status) into a final value
// string.
import type { ShapeTag } from "../../data/shapes";
import { toHex, toHexa, toArgbHex, toRgba, toHsla, toRgbaFromParts, type Rgba } from "../stdlib/colorValue";

export type ValueKind = "hex" | "hexa" | "argbHex" | "rgba" | "hsla";

export interface ValueFormatDef {
  appliesTo: ShapeTag | ShapeTag[];
  kind: ValueKind;
  // §2's "Reference vs. literal values" — only meaningful for shape "token".
  // When set AND the token is an alias into a scale step (tokenRef !=
  // null), the token renders via this reference template instead of `kind`'s
  // literal formatting. A token with no tokenRef always renders literally,
  // regardless of whether this is set. A real gap closed here: this was
  // fully implemented through the pipeline (composeEntry/formatValue) but
  // had no document-facing field at all — a document author could not
  // reach it.
  referenceStyle?: ReferenceStyle;
}

export const DEFAULT_VALUE_FORMAT: ValueFormatDef = {
  appliesTo: ["token", "scaleStep", "sourceColor"],
  kind: "hex",
};

// alpha01 defaults to 1 for shapes with no real opacity concept (token,
// scaleStep, sourceColor) — only sourceAlpha ever has a real, non-1 value.
export function renderLiteralValue(hex: string, def: ValueFormatDef, alpha01 = 1): string {
  switch (def.kind) {
    case "hex": return toHex(hex);
    case "hexa": return toHexa(hex, alpha01);
    case "argbHex": return toArgbHex(hex, alpha01);
    case "rgba": return toRgba(hex, alpha01);
    case "hsla": return toHsla(hex, alpha01);
  }
}

export function renderRgbaValue(rgba: Rgba): string {
  return toRgbaFromParts(rgba);
}

// §2's "Reference vs. literal values" — a token that's an alias into a scale
// step can render as a reference expression instead of its literal value.
// `tokenRef` is resolveExport()'s own "{colorName}-{stepName}"-shaped string
// (see src/shared/exportEng/helpers.ts's _splitTokenRef, which this mirrors
// without importing it — a one-line format, not worth a cross-package call).
export interface ReferenceStyle {
  kind: "reference";
  // The reference expression template — "${refColor}"/"${refStep}" are
  // substituted from the split tokenRef.
  template: string;
}

export function splitTokenRef(ref: string): { refColor: string; refStep: string } {
  const last = ref.lastIndexOf("-");
  return { refColor: ref.substring(0, last), refStep: ref.substring(last + 1) };
}

export function renderReference(tokenRef: string, style: ReferenceStyle): string {
  const { refColor, refStep } = splitTokenRef(tokenRef);
  return style.template.replace(/\$\{refColor\}/g, refColor).replace(/\$\{refStep\}/g, refStep);
}
