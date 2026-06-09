import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug } from './helpers';

export const fmtCSS = {
  scale(result: EngineResult, config: ExportConfig): string {
    const lines = ["/* " + (config.name || "tokens") + " — color scales */", ":root {"];
    const scaleNames = Object.keys(result.scales || {});
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _colorLabel(colorName, config);
      const scale = result.scales[colorName];
      lines.push("\n  /* " + colorName + " */");
      const steps = Object.keys(scale);
      for (let si = 0; si < steps.length; si++) {
        const step = steps[si];
        const entry = scale[step];
        lines.push("  --" + _slug(cLabel) + "-" + _slug(_stepLabel(step, config)) + ": " + entry.value + ";");
      }
    }
    lines.push("}");
    return lines.join("\n");
  },

  theme(result: EngineResult, config: ExportConfig, themeName: string, isFirst: boolean): string {
    const selector = isFirst
      ? ":root,\n[data-theme=\"" + themeName + "\"]"
      : "[data-theme=\"" + themeName + "\"]";
    const lines = ["/* " + themeName.toUpperCase() + " */", selector + " {"];
    const themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return lines.concat(["}"]).join("\n");
    const colorNames = Object.keys(themeTokens);
    for (let ci = 0; ci < colorNames.length; ci++) {
      const colorName = colorNames[ci];
      const cLabel = _colorLabel(colorName, config);
      lines.push("\n  /* " + colorName + " */");
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
          lines.push("  --" + segs.map(_slug).join("-") + ": " + token.value + ";");
        }
      }
    }
    lines.push("}");
    if (themeName.toLowerCase() === "dark") {
      // OS-level dark mode fallback: repeat the same declarations inside the media query
      const mediaLines = ["\n@media (prefers-color-scheme: dark) {", "  :root:not([data-theme]) {"];
      const darkTokens = result.tokens && result.tokens[themeName];
      if (darkTokens) {
        const dcNames = Object.keys(darkTokens);
        for (let dci = 0; dci < dcNames.length; dci++) {
          const dcName = dcNames[dci];
          const dcLabel = _colorLabel(dcName, config);
          const dRoles = darkTokens[dcName] as Record<string, Record<string, import("./types").TokenEntry>>;
          const dRoleIds = Object.keys(dRoles);
          for (let dri = 0; dri < dRoleIds.length; dri++) {
            const dRoleId = dRoleIds[dri];
            const dRoleObj = (config.roles && config.roles[dRoleId]) || { name: dRoleId, shorthand: "" };
            const dRLabel = _roleLabel(dRoleObj, config);
            const dVarDefs = _variationDefs(dRoleObj, config);
            const dVariations = dRoles[dRoleId];
            for (let dvi = 0; dvi < dVarDefs.length; dvi++) {
              const dToken = dVariations[String(dvi)];
              if (!dToken) continue;
              const dVLabel = _varLabel(dVarDefs[dvi], config);
              const dSegs = _tokenSegments(dcLabel, dRLabel, dVLabel, config);
              mediaLines.push("    --" + dSegs.map(_slug).join("-") + ": " + dToken.value + ";");
            }
          }
        }
      }
      mediaLines.push("  }\n}");
      lines.push(mediaLines.join("\n"));
    }
    return lines.join("\n");
  },
};
