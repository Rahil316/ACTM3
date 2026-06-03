import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _variationDefs, _slug, _splitTokenRef } from './helpers';

export const fmtDTCG = {
  scale(result: EngineResult, config: ExportConfig): string {
    const out: Record<string, Record<string, Record<string, string>>> = {};
    const scaleNames = Object.keys(result.scales || {});
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _slug(_colorLabel(colorName, config));
      const scale = result.scales[colorName];
      out[cLabel] = {};
      const steps = Object.keys(scale);
      for (let si = 0; si < steps.length; si++) {
        const step = steps[si];
        const entry = scale[step];
        const stepKey = _slug(_stepLabel(step, config));
        const node: Record<string, string> = { "$value": entry.value, "$type": "color" };
        if (config.includeDescriptions !== false && entry.description) {
          node["$description"] = entry.description;
        }
        out[cLabel][stepKey] = node;
      }
    }
    return JSON.stringify(out, null, 2);
  },

  theme(result: EngineResult, config: ExportConfig, themeName: string): string {
    const themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return "{}";
    const out: Record<string, Record<string, Record<string, Record<string, string>>>> = {};
    const colorNames = Object.keys(themeTokens);
    for (let ci = 0; ci < colorNames.length; ci++) {
      const colorName = colorNames[ci];
      const cLabel = _slug(_colorLabel(colorName, config));
      if (!out[cLabel]) out[cLabel] = {};
      const roles = themeTokens[colorName];
      const roleIds = Object.keys(roles);
      for (let ri = 0; ri < roleIds.length; ri++) {
        const roleId = roleIds[ri];
        const roleObj = (config.roles && config.roles[roleId]) || { name: roleId, shorthand: "" };
        const rLabel = _slug(_roleLabel(roleObj, config));
        if (!out[cLabel][rLabel]) out[cLabel][rLabel] = {};
        const varDefs = _variationDefs(roleObj, config);
        const variations = roles[roleId];
        for (let vi = 0; vi < varDefs.length; vi++) {
          const token = variations[String(vi)];
          if (!token) continue;
          const vLabel = _slug(_varLabel(varDefs[vi], config));
          let dtcgValue: string;
          if (token.tokenRef) {
            const parts = _splitTokenRef(token.tokenRef);
            dtcgValue = "{" + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            dtcgValue = token.value;
          }
          const node: Record<string, string> = { "$value": dtcgValue, "$type": "color" };
          if (token.isAdjusted) node["$description"] = "⚠ Adjusted for contrast";
          out[cLabel][rLabel][vLabel] = node;
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};
