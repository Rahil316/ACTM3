import type { EngineResult, ExportConfig } from './types';
import { _slug, _eachSourceColor } from './helpers';
import { resolveExport, resolveScaleSteps } from './resolve';

export const fmtTailwind = {
  config(result: EngineResult, config: ExportConfig): string {
    const lines: string[] = [];
    const imp = "import";
    lines.push("/** @type {" + imp + "('tailwindcss').Config} */");
    lines.push("module.exports = {");
    lines.push("  theme: {");
    lines.push("    extend: {");
    lines.push("      colors: {");
    const scaleSteps = resolveScaleSteps(result, config);
    let lastScaleColor: string | null = null;
    for (const step of scaleSteps) {
      if (step.colorName !== lastScaleColor) {
        if (lastScaleColor !== null) lines.push("        },");
        lines.push("        " + JSON.stringify(_slug(step.cLabel)) + ": {");
        lastScaleColor = step.colorName;
      }
      const stepSlug = _slug(step.stepKey);
      const varName = "--" + _slug(step.cLabel) + "-" + stepSlug;
      lines.push("          " + JSON.stringify(stepSlug) + ": \"var(" + varName + ")\",");
    }
    if (lastScaleColor !== null) lines.push("        },");
    const sourceColors = _eachSourceColor(config);
    if (sourceColors.length > 0) {
      lines.push("        // Source colors (CSS var references)");
      for (const entry of sourceColors) {
        const key = _slug(entry.cLabel);
        lines.push("        " + JSON.stringify(key) + ": \"var(--" + key + ")\",");
        for (const alpha of entry.alphaVariants) {
          const alphaKey = key + "-alpha-" + alpha.opacity;
          lines.push("        " + JSON.stringify(alphaKey) + ": \"var(--" + alphaKey + ")\",");
        }
      }
    }
    const themeKeys = Object.keys(result.tokens || {});
    if (themeKeys.length > 0) {
      const firstTheme = themeKeys[0];
      if (result.tokens[firstTheme]) {
        lines.push("        // Semantic tokens (CSS var references)");
        const { tokens } = resolveExport(result, config);
        for (const token of tokens) {
          if (token.theme !== firstTheme) continue;
          const tokenKey = token.segs.map((s) => _slug(s.label)).join("-");
          const varRef = "--" + tokenKey;
          lines.push("        " + JSON.stringify(tokenKey) + ": \"var(" + varRef + ")\",");
        }
      }
    }
    lines.push("      },");
    lines.push("    },");
    lines.push("  },");
    lines.push("  plugins: [],");
    lines.push("};");
    return lines.join("\n");
  },
};
