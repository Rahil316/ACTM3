import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _variationDefs, _slug, _splitTokenRef } from './helpers';

export const fmtStyleDictionary = {
  global(result: EngineResult, config: ExportConfig): string {
    const out: Record<string, Record<string, Record<string, Record<string, unknown>>>> = { color: {} };
    const scales = result.scales ?? {};
    const scaleNames = Object.keys(scales);
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _slug(_colorLabel(colorName, config));
      out.color[cLabel] = {};
      const scale = scales[colorName];
      const steps = Object.keys(scale);
      for (let si = 0; si < steps.length; si++) {
        const step = steps[si];
        const entry = scale[step];
        const stepKey = _slug(_stepLabel(step, config));
        out.color[cLabel][stepKey] = {
          value: entry.value,
          type: "color",
          attributes: { category: "color", scale: cLabel, step: stepKey },
        };
      }
    }
    return JSON.stringify(out, null, 2);
  },

  theme(result: EngineResult, config: ExportConfig, themeName: string): string {
    const themeTokens = result.tokens && result.tokens[themeName];
    if (!themeTokens) return "{}";
    const out: Record<string, Record<string, Record<string, Record<string, unknown>>>> = { color: {} };
    const colorNames = Object.keys(themeTokens);
    for (let ci = 0; ci < colorNames.length; ci++) {
      const colorName = colorNames[ci];
      const cLabel = _slug(_colorLabel(colorName, config));
      if (!out.color[cLabel]) out.color[cLabel] = {};
      const roles = themeTokens[colorName] as Record<string, Record<string, import("./types").TokenEntry>>;
      const roleIds = Object.keys(roles);
      for (let ri = 0; ri < roleIds.length; ri++) {
        const roleId = roleIds[ri];
        const roleObj = (config.roles && config.roles[roleId]) || { name: roleId, shorthand: "" };
        const rLabel = _slug(_roleLabel(roleObj, config));
        if (!out.color[cLabel][rLabel]) out.color[cLabel][rLabel] = {};
        const varDefs = _variationDefs(roleObj, config);
        const variations = roles[roleId];
        for (let vi = 0; vi < varDefs.length; vi++) {
          const token = variations[String(vi)];
          if (!token) continue;
          const vLabel = _slug(_varLabel(varDefs[vi], config));
          let sdValue: string;
          if (token.tokenRef) {
            const parts = _splitTokenRef(token.tokenRef);
            sdValue = "{color." + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            sdValue = token.value;
          }
          out.color[cLabel][rLabel][vLabel] = {
            value: sdValue,
            type: "color",
            attributes: { category: "color", role: rLabel, theme: themeName },
          };
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};
