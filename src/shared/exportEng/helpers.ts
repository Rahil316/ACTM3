import type { ExportConfig, EngineResult, TokenEntry, Role, Variation } from './types';

export type EachTokenCallback = (
  theme: string,
  colorName: string,
  roleObj: Role,
  varDef: Variation,
  token: TokenEntry,
  cLabel: string,
  rLabel: string,
  vLabel: string,
  segs: string[],
) => void;

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

export function _tokenSegments(colorLabel: string, roleLabel: string, varLabel: string, config: ExportConfig): string[] {
  const order = config.tokenNameSegments || ["color", "role", "variation"];
  const parts: Record<string, string> = { color: colorLabel, role: roleLabel, variation: varLabel };
  const out: string[] = [];
  for (let i = 0; i < order.length; i++) {
    const p = parts[order[i]];
    if (p) out.push(p);
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

export interface SourceColorEntry {
  colorName: string;
  cLabel: string;
  hex: string;
  alphaVariants: { opacity: number; rgba: { r: number; g: number; b: number; a: number } }[];
}

// Mirrors figmaVars.ts's syncGlobalColors naming/value convention exactly:
// base swatch = plain color label (no self-nested folder), alpha variants =
// "{label}/Alpha/{opacity}" with opacity baked into the alpha channel — same
// shapes and names a Figma sync would produce, so exports stay consistent
// with what's actually published (when includeColorScalesCollection-style
// export settings match Figma; see index.ts's applyExportOverrides).
export function _eachSourceColor(config: ExportConfig): SourceColorEntry[] {
  if (!config.includeSourceColors || !config.colors) return [];
  const alphaValues = config.alphaValues ?? [];
  return config.colors.map((color) => {
    const cLabel = config.useShorthandColors && color.shorthand ? color.shorthand : color.name;
    const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
    const rgb = _hexComponents(hex);
    const alphaVariants = alphaValues.map((opacity) => ({
      opacity,
      rgba: { r: rgb.r, g: rgb.g, b: rgb.b, a: opacity / 100 },
    }));
    return { colorName: color.name, cLabel, hex, alphaVariants };
  });
}

export function _eachToken(result: EngineResult, config: ExportConfig, cb: EachTokenCallback): void {
  const themeKeys = Object.keys(result.tokens || {});
  for (let ti = 0; ti < themeKeys.length; ti++) {
    const theme = themeKeys[ti];
    const themeTokens = result.tokens[theme];
    if (!themeTokens) continue;
    const colorNames = Object.keys(themeTokens);
    for (let ci = 0; ci < colorNames.length; ci++) {
      const colorName = colorNames[ci];
      const cLabel = _colorLabel(colorName, config);
      const roles = themeTokens[colorName] as Record<string, Record<string, TokenEntry>>;
      const roleIds = Object.keys(roles);
      for (let ri = 0; ri < roleIds.length; ri++) {
        const roleId = roleIds[ri];
        const roleObj: Role = (config.roles && config.roles[roleId]) || { _id: roleId, name: roleId, shorthand: roleId, variations: null };
        const rLabel = _roleLabel(roleObj, config);
        const varDefs = _variationDefs(roleObj, config);
        const variations = roles[roleId];
        for (let vi = 0; vi < varDefs.length; vi++) {
          const token = variations[String(vi)];
          if (!token) continue;
          const vLabel = _varLabel(varDefs[vi], config);
          const segs = _tokenSegments(cLabel, rLabel, vLabel, config);
          cb(theme, colorName, roleObj, varDefs[vi], token, cLabel, rLabel, vLabel, segs);
        }
      }
    }
  }
}
