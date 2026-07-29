import type { EngineResult, ExportConfig } from './types';
import { _slug, _splitTokenRef, _eachSourceColor } from './helpers';
import { resolveExport, resolveScaleSteps } from './resolve';

export const fmtSCSS = {
  source(config: ExportConfig): string {
    const lines = ["// " + (config.name || "tokens") + " — source colors", "// Do not edit manually.\n"];
    for (const entry of _eachSourceColor(config)) {
      lines.push("$" + _slug(entry.cLabel) + ": " + entry.hex + ";");
      for (const alpha of entry.alphaVariants) {
        const { r, g, b, a } = alpha.rgba;
        lines.push("$" + _slug(entry.cLabel) + "-alpha-" + alpha.opacity + ": rgba(" + r + ", " + g + ", " + b + ", " + a + ");");
      }
    }
    return lines.join("\n");
  },

  scale(result: EngineResult, config: ExportConfig): string {
    const lines = ["// " + (config.name || "tokens") + " — color scale variables", "// Do not edit manually.\n"];
    const steps = resolveScaleSteps(result, config);
    let lastColor: string | null = null;
    let colorSteps: typeof steps = [];
    const flush = () => {
      if (colorSteps.length === 0) return;
      lines.push("$scale-" + _slug(colorSteps[0].cLabel) + ": (");
      for (const s of colorSteps) {
        lines.push("  " + _slug(s.stepKey) + ": $" + _slug(s.cLabel) + "-" + _slug(s.stepKey) + ",");
      }
      lines.push(");\n");
    };
    for (const step of steps) {
      if (step.colorName !== lastColor) {
        flush();
        lines.push("// " + step.colorName);
        colorSteps = [];
        lastColor = step.colorName;
      }
      lines.push("$" + _slug(step.cLabel) + "-" + _slug(step.stepKey) + ": " + step.value + ";");
      colorSteps.push(step);
    }
    flush();
    return lines.join("\n");
  },

  tokens(result: EngineResult, config: ExportConfig): string {
    const hasScales = Object.keys(result.scales || {}).length > 0;
    const lines = ["// " + (config.name || "tokens") + " — semantic token maps", "@use 'sass:map';\n", ...(hasScales ? ["@forward 'scale';\n"] : [])];
    const { tokens } = resolveExport(result, config);
    const themeKeys = Object.keys(result.tokens || {});
    for (const theme of themeKeys) {
      if (!result.tokens[theme]) continue;
      lines.push("$tokens-" + _slug(theme) + ": (");
      let lastColor: string | null = null;
      for (const token of tokens) {
        if (token.theme !== theme) continue;
        if (token.colorName !== lastColor) {
          lines.push("  // " + token.colorName);
          lastColor = token.colorName;
        }
        const key = token.segs.map((s) => _slug(s.label)).join("-");
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
