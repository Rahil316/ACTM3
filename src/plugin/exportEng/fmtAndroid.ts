import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegments, _variationDefs, _slug, _snake, _hexComponents } from './helpers';

function _toARGB(hex: string): string {
  var rgb = _hexComponents(hex);
  var toHex2 = function(n: number): string { var s = n.toString(16).toUpperCase(); return s.length === 1 ? "0" + s : s; };
  return "#FF" + toHex2(rgb.r) + toHex2(rgb.g) + toHex2(rgb.b);
}

export const fmtAndroid = {
  file(result: EngineResult, config: ExportConfig, themeName: string): string {
    var themeTokens = result.tokens && result.tokens[themeName];
    var lines: string[] = [];
    lines.push("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
    lines.push("<resources>");
    lines.push("");
    var scaleNames = Object.keys(result.scales || {});
    if (scaleNames.length > 0) {
      lines.push("    <!-- Color Scales -->");
      for (var ci = 0; ci < scaleNames.length; ci++) {
        var colorName = scaleNames[ci];
        var cLabel = _colorLabel(colorName, config);
        var scale = result.scales[colorName];
        var steps = Object.keys(scale);
        lines.push("    <!-- " + colorName + " -->");
        for (var si = 0; si < steps.length; si++) {
          var step = steps[si];
          var entry = scale[step];
          var resName = _snake([cLabel, _stepLabel(step, config)]);
          var argb = _toARGB(entry.value);
          lines.push("    <color name=\"" + resName + "\">" + argb + "</color>");
        }
      }
      lines.push("");
    }
    if (themeTokens) {
      lines.push("    <!-- Semantic Tokens — " + themeName + " -->");
      var colorNames = Object.keys(themeTokens);
      for (var ci2 = 0; ci2 < colorNames.length; ci2++) {
        var colorName2 = colorNames[ci2];
        var cLabel2 = _colorLabel(colorName2, config);
        lines.push("    <!-- " + colorName2 + " -->");
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
            var resName2 = _snake(segs);
            var argb2 = _toARGB(token.value);
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
