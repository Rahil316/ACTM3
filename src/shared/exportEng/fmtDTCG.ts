import type { EngineResult, ExportConfig } from './types';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegmentsTyped, _variationDefs, _slug, _setNestedSlug, _splitTokenRef, _eachSourceColor } from './helpers';

export const fmtDTCG = {
  source(config: ExportConfig): string {
    const out: Record<string, Record<string, string>> = {};
    for (const entry of _eachSourceColor(config)) {
      const cLabel = _slug(entry.cLabel);
      out[cLabel] = { "$value": entry.hex, "$type": "color" };
      if (entry.description) out[cLabel]["$description"] = entry.description;
      for (const alpha of entry.alphaVariants) {
        const { r, g, b, a } = alpha.rgba;
        const key = cLabel + "-alpha-" + alpha.opacity;
        out[key] = { "$value": `rgba(${r}, ${g}, ${b}, ${a})`, "$type": "color" };
        if (alpha.description) out[key]["$description"] = alpha.description;
      }
    }
    return JSON.stringify(out, null, 2);
  },

  scale(result: EngineResult, config: ExportConfig): string {
    const out: Record<string, Record<string, Record<string, string>>> = {};
    const scales = result.scales ?? {};
    const scaleNames = Object.keys(scales);
    for (let ci = 0; ci < scaleNames.length; ci++) {
      const colorName = scaleNames[ci];
      const cLabel = _slug(_colorLabel(colorName, config));
      const scale = scales[colorName];
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
    const out: Record<string, unknown> = {};
    const colorNames = Object.keys(themeTokens);
    for (let ci = 0; ci < colorNames.length; ci++) {
      const colorName = colorNames[ci];
      const cLabel = _colorLabel(colorName, config);
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
          let dtcgValue: string;
          if (token.tokenRef) {
            const parts = _splitTokenRef(token.tokenRef);
            dtcgValue = "{" + _slug(parts.color) + "." + _slug(parts.step) + "}";
          } else {
            dtcgValue = token.value;
          }
          const node: Record<string, string> = { "$value": dtcgValue, "$type": "color" };
          if (token.isAdjusted) node["$description"] = "⚠ Adjusted for contrast";
          const segs = _tokenSegmentsTyped(cLabel, rLabel, vLabel, config);
          _setNestedSlug(out, segs, node);
        }
      }
    }
    return JSON.stringify(out, null, 2);
  },
};
