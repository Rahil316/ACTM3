import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug, _splitTokenRef } from './helpers';

export const fmtSCSS = {
  scale(result: EngineResult, config: ExportConfig): string {
    const lines = ["// " + (config.name || "tokens") + " — color scale variables", "// Do not edit manually.\n"];
    const scaleNames = Object.keys(result.scales || {});
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _colorLabel(colorName, config);
      const scale = result.scales[colorName];
      lines.push("// " + colorName);
      const steps = Object.keys(scale);
      for (let si = 0; si < steps.length; si++) {
        const step = steps[si];
        const entry = scale[step];
        if (!entry || !entry.value) continue;
        lines.push("$" + _slug(cLabel) + "-" + _slug(_stepLabel(step, config)) + ": " + entry.value + ";");
      }
      lines.push("$scale-" + _slug(cLabel) + ": (");
      for (let si2 = 0; si2 < steps.length; si2++) {
        const step2 = steps[si2];
        const entry2 = result.scales[colorName][step2];
        if (!entry2 || !entry2.value) continue;
        lines.push("  " + _slug(_stepLabel(step2, config)) + ": $" + _slug(cLabel) + "-" + _slug(_stepLabel(step2, config)) + ",");
      }
      lines.push(");\n");
    }
    return lines.join("\n");
  },

  tokens(result: EngineResult, config: ExportConfig): string {
    const hasScales = Object.keys(result.scales || {}).length > 0;
    const lines = ["// " + (config.name || "tokens") + " — semantic token maps", "@use 'sass:map';\n", ...(hasScales ? ["@forward 'scale';\n"] : [])];
    const themeKeys = Object.keys(result.tokens || {});
    for (let ti = 0; ti < themeKeys.length; ti++) {
      const theme = themeKeys[ti];
      const themeTokens = result.tokens[theme];
      if (!themeTokens) continue;
      lines.push("$tokens-" + _slug(theme) + ": (");
      const colorNames = Object.keys(themeTokens);
      for (let ci = 0; ci < colorNames.length; ci++) {
        const colorName = colorNames[ci];
        const cLabel = _colorLabel(colorName, config);
        lines.push("  // " + colorName);
        const roles = themeTokens[colorName] as Record<string, Record<string, import("./types").TokenEntry>>;
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
            const segs = _tokenSegments(cLabel, rLabel, vLabel, config);
            const key = segs.map(_slug).join("-");
            let ref: string;
            if (token.tokenRef) {
              const parts = _splitTokenRef(token.tokenRef);
              ref = "$" + _slug(parts.color) + "-" + _slug(parts.step);
            } else {
              ref = token.value;
            }
            const note = token.isAdjusted ? " /* ⚠ adjusted */" : "";
            lines.push("  \"" + key + "\": " + ref + "," + note);
          }
        }
      }
      lines.push(");\n");
    }
    return lines.join("\n");
  },

  index(result: EngineResult, config: ExportConfig): string {
    const themeKeys = Object.keys(result.tokens || {});
    const lines = [
      "// " + (config.name || "tokens") + " — theme output",
      "@use 'sass:map';",
      "@use 'tokens' as *;\n",
      "/// Writes all token map entries as CSS custom properties.",
      "/// Usage: @include apply-theme($tokens-light);",
      "@mixin apply-theme($tokens) {",
      "  @each $name, $value in $tokens {",
      "    --#{$name}: #{$value};",
      "  }",
      "}\n",
      "// Class-based theming",
    ];
    for (let ti = 0; ti < themeKeys.length; ti++) {
      const theme = themeKeys[ti];
      const varName = "$tokens-" + _slug(theme);
      if (ti === 0) {
        lines.push(":root,\n[data-theme=\"" + theme + "\"] {\n  @include apply-theme(" + varName + ");\n}\n");
      } else {
        lines.push("[data-theme=\"" + theme + "\"] {\n  @include apply-theme(" + varName + ");\n}\n");
      }
    }
    let darkKey: string | null = null;
    for (let ti2 = 0; ti2 < themeKeys.length; ti2++) {
      if (themeKeys[ti2].toLowerCase() === "dark") { darkKey = themeKeys[ti2]; break; }
    }
    if (darkKey) {
      lines.push("// OS-level dark mode fallback");
      lines.push("@media (prefers-color-scheme: dark) {");
      lines.push("  :root:not([data-theme]) {");
      lines.push("    @include apply-theme($tokens-" + _slug(darkKey) + ");");
      lines.push("  }\n}");
    }
    return lines.join("\n");
  },
};
