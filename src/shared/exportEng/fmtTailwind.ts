import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug } from './helpers';

export const fmtTailwind = {
  config(result: EngineResult, config: ExportConfig): string {
    const lines: string[] = [];
    const imp = "import";
    lines.push("/** @type {" + imp + "('tailwindcss').Config} */");
    lines.push("module.exports = {");
    lines.push("  theme: {");
    lines.push("    extend: {");
    lines.push("      colors: {");
    const scales = result.scales ?? {};
    const scaleNames = Object.keys(scales);
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _colorLabel(colorName, config);
      const scale = scales[colorName];
      const steps = Object.keys(scale);
      lines.push("        " + JSON.stringify(_slug(cLabel)) + ": {");
      for (let si = 0; si < steps.length; si++) {
        const step = steps[si];
        const stepSlug = _slug(_stepLabel(step, config));
        const varName = "--" + _slug(cLabel) + "-" + stepSlug;
        lines.push("          " + JSON.stringify(stepSlug) + ": \"var(" + varName + ")\",");
      }
      lines.push("        },");
    }
    const themeKeys = Object.keys(result.tokens || {});
    if (themeKeys.length > 0) {
      const firstTheme = themeKeys[0];
      const themeTokens = result.tokens[firstTheme];
      if (themeTokens) {
        lines.push("        // Semantic tokens (CSS var references)");
        const colorNames = Object.keys(themeTokens);
        for (let ci2 = 0; ci2 < colorNames.length; ci2++) {
          const colorName2 = colorNames[ci2];
          const cLabel2 = _colorLabel(colorName2, config);
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
              const tokenKey = segs.map(_slug).join("-");
              const varRef = "--" + tokenKey;
              lines.push("        " + JSON.stringify(tokenKey) + ": \"var(" + varRef + ")\",");
            }
          }
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
