import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug } from './helpers';

export const fmtCSS = {
  scale(result: EngineResult, config: ExportConfig): string {
    var lines = ["/* " + (config.name || "tokens") + " — color scales */", ":root {"];
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      lines.push("\n  /* " + colorName + " */");
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        lines.push("  --" + _slug(cLabel) + "-" + _slug(_stepLabel(step, config)) + ": " + entry.value + ";");
      }
    }
    lines.push("}");
    return lines.join("\n");
  },

  theme(result: EngineResult, config: ExportConfig, themeName: string, isFirst: boolean): string {
    var selector = isFirst
      ? ":root,\n[data-theme=\"" + themeName + "\"]"
      : "[data-theme=\"" + themeName + "\"]";
    var lines = ["/* " + themeName.toUpperCase() + " */", selector + " {"];
    var themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return lines.concat(["}"]).join("\n");
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _colorLabel(colorName, config);
      lines.push("\n  /* " + colorName + " */");
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
        var rLabel = _roleLabel(roleObj, config);
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _varLabel(varDefs[vi], config);
          var segs = _tokenSegments(cLabel, rLabel, vLabel, config);
          lines.push("  --" + segs.map(_slug).join("-") + ": " + token.value + ";");
        }
      }
    }
    lines.push("}");
    if (themeName.toLowerCase() === "dark") {
      lines.push("\n@media (prefers-color-scheme: dark) {");
      lines.push("  :root:not([data-theme]) {");
      lines.push("  }\n}");
    }
    return lines.join("\n");
  },
};
