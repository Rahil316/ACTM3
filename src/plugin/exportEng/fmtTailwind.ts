import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug } from './helpers';

export const fmtTailwind = {
  config(result: EngineResult, config: ExportConfig): string {
    var lines: string[] = [];
    const imp = "import";
    lines.push("/** @type {" + imp + "('tailwindcss').Config} */");
    lines.push("module.exports = {");
    lines.push("  theme: {");
    lines.push("    extend: {");
    lines.push("      colors: {");
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _colorLabel(colorName, config);
      var scale = result.scales[colorName];
      var steps = Object.keys(scale);
      lines.push("        " + JSON.stringify(_slug(cLabel)) + ": {");
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var stepSlug = _slug(_stepLabel(step, config));
        var varName = "--" + _slug(cLabel) + "-" + stepSlug;
        lines.push("          " + JSON.stringify(stepSlug) + ": \"var(" + varName + ")\",");
      }
      lines.push("        },");
    }
    var themeKeys = Object.keys(result.tokens || {});
    if (themeKeys.length > 0) {
      var firstTheme = themeKeys[0];
      var themeTokens = result.tokens[firstTheme];
      if (themeTokens) {
        lines.push("        // Semantic tokens (CSS var references)");
        var colorNames = Object.keys(themeTokens);
        for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
          var colorName2 = colorNames[ci2];
          var cLabel2 = _colorLabel(colorName2, config);
          var roles = themeTokens[colorName2];
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
              var segs = _tokenSegments(cLabel2, rLabel, vLabel, config);
              var tokenKey = segs.map(_slug).join("-");
              var varRef = "--" + tokenKey;
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
