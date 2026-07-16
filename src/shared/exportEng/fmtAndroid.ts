import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug, _snake, _hexComponents } from './helpers';

function _toARGB(hex: string): string {
  const rgb = _hexComponents(hex);
  const toHex2 = function(n: number): string { const s = n.toString(16).toUpperCase(); return s.length === 1 ? "0" + s : s; };
  return "#FF" + toHex2(rgb.r) + toHex2(rgb.g) + toHex2(rgb.b);
}

export const fmtAndroid = {
  file(result: EngineResult, config: ExportConfig, themeName: string, isNonStandardQualifier = false): string {
    const themeTokens = result.tokens && result.tokens[themeName];
    const lines: string[] = [];
    lines.push("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
    if (isNonStandardQualifier) {
      lines.push("<!-- Theme: " + themeName + " -->");
      lines.push("<!-- Note: '" + themeName + "' is not a standard Android resource qualifier.");
      lines.push("     Apply these tokens programmatically using a custom theme overlay. -->");
    }
    lines.push("<resources>");
    lines.push("");
    const scales = result.scales ?? {};
    const scaleNames = Object.keys(scales);
    if (scaleNames.length > 0) {
      lines.push("    <!-- Color Scales -->");
      for (let ci = 0; ci < scaleNames.length; ci++) {
        const colorName = scaleNames[ci];
        const cLabel = _colorLabel(colorName, config);
        const scale = scales[colorName];
        const steps = Object.keys(scale);
        lines.push("    <!-- " + colorName + " -->");
        for (let si = 0; si < steps.length; si++) {
          const step = steps[si];
          const entry = scale[step];
          const resName = _snake([cLabel, _stepLabel(step, config)]);
          const argb = _toARGB(entry.value);
          lines.push("    <color name=\"" + resName + "\">" + argb + "</color>");
        }
      }
      lines.push("");
    }
    if (themeTokens) {
      lines.push("    <!-- Semantic Tokens — " + themeName + " -->");
      const colorNames = Object.keys(themeTokens);
      for (let ci2 = 0; ci2 < colorNames.length; ci2++) {
        const colorName2 = colorNames[ci2];
        const cLabel2 = _colorLabel(colorName2, config);
        lines.push("    <!-- " + colorName2 + " -->");
        const roles = themeTokens[colorName2] as Record<string, Record<string, import("./types").TokenEntry>>;
        const roleIds = Object.keys(roles);
        for (let ri = 0; ri < roleIds.length; ri++) {
          const roleId = roleIds[ri];
          const roleObj = (config.roles && config.roles[roleId]) || { name: roleId, shorthand: "" };
          const rLabel = _roleLabel(roleObj, config);
          const varDefs = _variationDefs(roleObj, config);
          const variations = roles[roleId];
          for (let vi = 0; vi < varDefs.length; vi++) {
            const token = variations[String(vi)];
            if (!token) continue;
            const vLabel = _varLabel(varDefs[vi], config);
            const segs = _tokenSegments(cLabel2, rLabel, vLabel, config);
            const resName2 = _snake(segs);
            const argb2 = _toARGB(token.value);
            lines.push("    <color name=\"" + resName2 + "\">" + argb2 + "</color>");
          }
        }
      }
      lines.push("");
    }
    lines.push("</resources>");
    return lines.join("\n");
  },
};
