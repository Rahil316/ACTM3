import type { ExportConfig, Role, Variation } from './types';

export function _colorLabel(colorName: string, config: ExportConfig): string {
  if (!config.useShorthandColors) return colorName;
  for (let i = 0; i < (config.colors || []).length; i++) {
    if (config.colors![i].name === colorName && config.colors![i].shorthand)
      return config.colors![i].shorthand!;
  }
  return colorName;
}

export function _roleLabel(roleObj: Role, config: ExportConfig): string {
  if (!config.useShorthandRoles) return roleObj.name;
  return (roleObj && roleObj.shorthand) ? roleObj.shorthand : roleObj.name;
}

export function _varLabel(varDef: Variation, config: ExportConfig): string {
  if (!config.useShorthandVariations) return varDef.name;
  return (varDef && varDef.shorthand) ? varDef.shorthand : varDef.name;
}

export function _stepLabel(stepName: string, config: ExportConfig): string {
  if (!config.useShorthandSteps) return stepName;
  const sh = config.scaleStepShorthands && config.scaleStepShorthands[stepName];
  return sh ? sh : stepName;
}

// Same ordering/omission as a flat tokenNameSegments join, but keeps each segment's type
// tagged alongside its label — lets a caller apply a per-type key convention
// (e.g. React Native's camelCase color/role keys vs. slugged variation keys)
// independent of where tokenNameSegments places that segment in the nesting.
export function _tokenSegmentsTyped(colorLabel: string, roleLabel: string, varLabel: string, config: ExportConfig): { type: "color" | "role" | "variation"; label: string }[] {
  const order = config.tokenNameSegments || ["color", "role", "variation"];
  const parts: Record<string, string> = { color: colorLabel, role: roleLabel, variation: varLabel };
  const out: { type: "color" | "role" | "variation"; label: string }[] = [];
  for (let i = 0; i < order.length; i++) {
    const type = order[i] as "color" | "role" | "variation";
    const p = parts[type];
    if (p) out.push({ type, label: p });
  }
  return out;
}

export function _variationDefs(roleObj: Role, config: ExportConfig): Variation[] {
  return roleObj.variations ?? config.variations ?? [];
}

export function _slug(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).toLowerCase().trim()
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Single source of truth for export/download naming, shared between the UI
// (outer zip/file name) and the bundler (inner folder/file paths) so the two
// can't drift out of sync when the naming convention changes.

export function _projectSlug(name: string | null | undefined): string {
  return _slug(name) || "tokens";
}

// Compact timestamp string: YYYYMMDD-HHmm (UTC)
export function _exportTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "-" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes())
  );
}

export function _camel(parts: string[]): string {
  return parts.map(function(p, i) {
    const s = _slug(p).replace(/-([a-z0-9])/g, function(_, c) { return c.toUpperCase(); });
    return i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
  }).join("");
}

export function _snake(parts: string[]): string {
  return parts.map(function(p) { return _slug(p).replace(/-/g, "_"); }).join("_");
}

// Renders a tree built by _setNested into indented "key: value as string,"
// lines (React Native's TS object literal syntax) — leaves are the string
// values assigned via _setNested, branches recurse one indent level deeper.
export function _renderTsLiteralLines(node: Record<string, unknown>, indent: string): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(node)) {
    const value = node[key];
    if (typeof value === "string") {
      lines.push(indent + JSON.stringify(key) + ": " + JSON.stringify(value) + " as string,");
    } else {
      lines.push(indent + JSON.stringify(key) + ": {");
      lines.push(...(_renderTsLiteralLines(value as Record<string, unknown>, indent + "  ")));
      lines.push(indent + "},");
    }
  }
  return lines;
}

export function _hexComponents(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function _splitTokenRef(ref: string): { color: string; step: string } {
  const last = ref.lastIndexOf("-");
  return { color: ref.substring(0, last), step: ref.substring(last + 1) };
}

// Nests `leaf` into `root` following `segs` (from _tokenSegmentsTyped: the
// color/role/variation labels in tokenNameSegments order) — so nested-object
// formats (DTCG, Style Dictionary, React Native) honor the same segment
// order/omission as the flat, string-joined formats (CSS, SCSS, Android,
// Tailwind) instead of hardcoding color->role->variation. `keyFn` picks the
// object key for a given segment — DTCG/Style Dictionary use _slug for every
// type; React Native uses _camel for color/role but _slug for variation (see
// fmtReactNative.ts), so keyFn is given the segment's type alongside its
// label rather than assuming one convention for all three. A 2-segment
// config (role omitted) nests one level shallower, same as the flat formats
// dropping that segment entirely.
export function _setNested(root: Record<string, unknown>, segs: { type: "color" | "role" | "variation"; label: string }[], leaf: unknown, keyFn: (s: { type: "color" | "role" | "variation"; label: string }) => string): void {
  let node = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const key = keyFn(segs[i]);
    if (typeof node[key] !== "object" || node[key] === null) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keyFn(segs[segs.length - 1])] = leaf;
}

export function _setNestedSlug(root: Record<string, unknown>, segs: { type: "color" | "role" | "variation"; label: string }[], leaf: unknown): void {
  _setNested(root, segs, leaf, (s) => _slug(s.label));
}

interface SourceColorEntry {
  colorName: string;
  cLabel: string;
  hex: string;
  description: string; // "" when includeDescriptions is off — callers should treat falsy as "omit"
  alphaVariants: { opacity: number; description: string; rgba: { r: number; g: number; b: number; a: number } }[];
}

// Mirrors figmaVars.ts's syncGlobalColors naming/value/description convention
// exactly: base swatch = plain color label (no self-nested folder), alpha
// variants = "{label}/Alpha/{opacity}" with opacity baked into the alpha
// channel, base description = color.description or the same fallback text
// syncGlobalColors uses, alpha description = "{opacity}% opacity variant" —
// same shapes/names/text a Figma sync would produce, so exports stay
// consistent with what's actually published (when the Export Settings tab is
// matching Figma; see index.ts's applyExportOverrides).
export function _eachSourceColor(config: ExportConfig): SourceColorEntry[] {
  if (!config.includeSourceColors || !config.colors) return [];
  const alphaValues = config.alphaValues ?? [];
  const includeDesc = config.includeDescriptions !== false;
  return config.colors.map((color) => {
    const cLabel = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
    const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
    const rgb = _hexComponents(hex);
    const description = includeDesc ? color.description || "Brand constant — raw hex, no theme processing" : "";
    const alphaVariants = alphaValues.map((opacity) => ({
      opacity,
      description: includeDesc ? `${opacity}% opacity variant` : "",
      rgba: { r: rgb.r, g: rgb.g, b: rgb.b, a: opacity / 100 },
    }));
    return { colorName: color.name, cLabel, hex, description, alphaVariants };
  });
}

