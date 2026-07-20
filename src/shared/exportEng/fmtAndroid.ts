import type { EngineResult, ExportConfig } from './types';
import { _snake, _hexComponents, _eachSourceColor } from './helpers';
import type { ResolvedToken, ResolvedScaleStep } from './resolve';

function _toHex2(n: number): string { const s = n.toString(16).toUpperCase(); return s.length === 1 ? "0" + s : s; }

function _toARGB(hex: string, alpha01 = 1): string {
  const rgb = _hexComponents(hex);
  return "#" + _toHex2(Math.round(alpha01 * 255)) + _toHex2(rgb.r) + _toHex2(rgb.g) + _toHex2(rgb.b);
}

export const fmtAndroid = {
  file(result: EngineResult, tokens: ResolvedToken[], scaleSteps: ResolvedScaleStep[], config: ExportConfig, themeName: string, isNonStandardQualifier = false): string {
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
    const sourceColors = _eachSourceColor(config);
    if (sourceColors.length > 0) {
      lines.push("    <!-- Source Colors (raw, no theme processing) -->");
      for (const entry of sourceColors) {
        lines.push("    <color name=\"" + _snake([entry.cLabel, "source"]) + "\">" + _toARGB(entry.hex) + "</color>");
        for (const alpha of entry.alphaVariants) {
          lines.push("    <color name=\"" + _snake([entry.cLabel, "source", "alpha", String(alpha.opacity)]) + "\">" + _toARGB(entry.hex, alpha.rgba.a) + "</color>");
        }
      }
      lines.push("");
    }
    if (scaleSteps.length > 0) {
      lines.push("    <!-- Color Scales -->");
      let lastScaleColor: string | null = null;
      for (const step of scaleSteps) {
        if (step.colorName !== lastScaleColor) {
          lines.push("    <!-- " + step.colorName + " -->");
          lastScaleColor = step.colorName;
        }
        const resName = _snake([step.cLabel, step.stepKey]);
        lines.push("    <color name=\"" + resName + "\">" + _toARGB(step.value) + "</color>");
      }
      lines.push("");
    }
    if (themeTokens) {
      lines.push("    <!-- Semantic Tokens — " + themeName + " -->");
      let lastColor: string | null = null;
      for (const token of tokens) {
        if (token.theme !== themeName) continue;
        if (token.colorName !== lastColor) {
          lines.push("    <!-- " + token.colorName + " -->");
          lastColor = token.colorName;
        }
        const resName = _snake(token.segs.map((s) => s.label));
        lines.push("    <color name=\"" + resName + "\">" + _toARGB(token.value) + "</color>");
      }
      lines.push("");
    }
    lines.push("</resources>");
    return lines.join("\n");
  },
};
