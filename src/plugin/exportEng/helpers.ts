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
  for (var i = 0; i < (config.colors || []).length; i++) {
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
  var sh = config.scaleStepShorthands && config.scaleStepShorthands[stepName];
  return sh ? sh : stepName;
}

export function _tokenSegments(colorLabel: string, roleLabel: string, varLabel: string, config: ExportConfig): string[] {
  var order = config.tokenNameSegments || ["color", "role", "variation"];
  var parts: Record<string, string> = { color: colorLabel, role: roleLabel, variation: varLabel };
  var out: string[] = [];
  for (var i = 0; i < order.length; i++) {
    var p = parts[order[i]];
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

export function _camel(parts: string[]): string {
  return parts.map(function(p, i) {
    var s = _slug(p).replace(/-([a-z0-9])/g, function(_, c) { return c.toUpperCase(); });
    return i === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
  }).join("");
}

export function _snake(parts: string[]): string {
  return parts.map(function(p) { return _slug(p).replace(/-/g, "_"); }).join("_");
}

export function _hexComponents(hex: string): { r: number; g: number; b: number } {
  var h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function _splitTokenRef(ref: string): { color: string; step: string } {
  var last = ref.lastIndexOf("-");
  return { color: ref.substring(0, last), step: ref.substring(last + 1) };
}

export function _eachToken(result: EngineResult, config: ExportConfig, cb: EachTokenCallback): void {
  var themeKeys = Object.keys(result.tokens || {});
  for (var ti = 0; ti < themeKeys.length; ti++) {
    var theme = themeKeys[ti];
    var themeTokens = result.tokens[theme];
    if (!themeTokens) continue;
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj: Role = (config.roles && config.roles[roleId]) || { _id: roleId, name: roleId, shorthand: roleId, mappingMethod: 'contrast', variations: null };
        var rLabel = _roleLabel(roleObj, config);
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _varLabel(varDefs[vi], config);
          var segs = _tokenSegments(cLabel, rLabel, vLabel, config);
          cb(theme, colorName, roleObj, varDefs[vi], token, cLabel, rLabel, vLabel, segs);
        }
      }
    }
  }
}
