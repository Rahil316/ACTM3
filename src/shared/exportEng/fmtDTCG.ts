import type { EngineResult, ExportConfig } from './types';
import { _slug, _setNestedSlug, _splitTokenRef, _eachSourceColor } from './helpers';
import { resolveScaleSteps, type ResolvedToken } from './resolve';

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
    for (const step of resolveScaleSteps(result, config)) {
      const cLabel = _slug(step.cLabel);
      if (!out[cLabel]) out[cLabel] = {};
      const stepKey = _slug(step.stepKey);
      const node: Record<string, string> = { "$value": step.value, "$type": "color" };
      if (config.includeDescriptions !== false && step.description) {
        node["$description"] = step.description;
      }
      out[cLabel][stepKey] = node;
    }
    return JSON.stringify(out, null, 2);
  },

  theme(result: EngineResult, tokens: ResolvedToken[], _config: ExportConfig, themeName: string): string {
    if (!result.tokens || !result.tokens[themeName]) return "{}";
    const out: Record<string, unknown> = {};
    for (const token of tokens) {
      if (token.theme !== themeName) continue;
      let dtcgValue: string;
      if (token.tokenRef) {
        const parts = _splitTokenRef(token.tokenRef);
        dtcgValue = "{" + _slug(parts.color) + "." + _slug(parts.step) + "}";
      } else {
        dtcgValue = token.value;
      }
      const node: Record<string, string> = { "$value": dtcgValue, "$type": "color" };
      if (token.isAdjusted) node["$description"] = "⚠ Adjusted for contrast";
      _setNestedSlug(out, token.segs, node);
    }
    return JSON.stringify(out, null, 2);
  },
};
