import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _variationDefs, _slug, _splitTokenRef } from './helpers';

export const fmtDTCG = {
  scale(result: EngineResult, config: ExportConfig): string {
    var out: Record<string, Record<string, Record<string, string>>> = {};
    var scaleNames = Object.keys(result.scales || {});
    for (var ci = 0; ci < scaleNames.length; ci++) {
      var colorName = scaleNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      var scale = result.scales[colorName];
      out[cLabel] = {};
      var steps = Object.keys(scale);
      for (var si = 0; si < steps.length; si++) {
        var step = steps[si];
        var entry = scale[step];
        var stepKey = _slug(_stepLabel(step, config));
        var node: Record<string, string> = { "$value": entry.value, "$type": "color" };
        if (config.includeDescriptions !== false && entry.description) {
          node["$description"] = entry.description;
        }
        out[cLabel][stepKey] = node;
      }
    }
    return JSON.stringify(out, null, 2);
  },

  theme(result: EngineResult, config: ExportConfig, themeName: string): string {
    var themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return "{}";
    var out: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
    var colorNames = Object.keys(themeTokens);
    for (var ci = 0; ci < colorNames.length; ci++) {
      var colorName = colorNames[ci];
      var cLabel = _slug(_colorLabel(colorName, config));
      if (!out[cLabel]) out[cLabel] = {};
      var roles = themeTokens[colorName];
      var roleIds = Object.keys(roles);
      for (var ri = 0; ri < roleIds.length; ri++) {
        var roleId = roleIds[ri];
        var roleObj = (config.roles && config.roles[roleId]) || { name: roleId };
        var rLabel = _slug(_roleLabel(roleObj, config));
        if (!out[cLabel][rLabel]) out[cLabel][rLabel] = {};
        var varDefs = _variationDefs(roleObj, config);
        var variations = roles[roleId];
        for (var vi = 0; vi < varDefs.length; vi++) {
          var token = variations[String(vi)];
          if (!token) continue;
          var vLabel = _slug(_varLabel(varDefs[vi], config));
          var dtcgValue: string;
          if (token.tokenRef) {
            var parts = _splitTokenRef(token.tokenRef);
            dtcgValue = "{" + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            dtcgValue = token.value;
          }
          var node: Record<string, string> = { "$value": dtcgValue, "$type": "color" };
          if (token.isAdjusted) node["$description"] = "⚠ Adjusted for contrast";
          out[cLabel][rLabel][vLabel] = node;
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};
