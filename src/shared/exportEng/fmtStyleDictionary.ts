import type { EngineResult, ExportConfig } from './types';
import { _slug, _roleLabel, _setNestedSlug, _splitTokenRef, _eachSourceColor } from './helpers';
import { resolveScaleSteps, type ResolvedToken } from './resolve';

export const fmtStyleDictionary = {
  global(result: EngineResult, config: ExportConfig): string {
    // "source" is a sibling namespace to "color" (scale), not merged into it —
    // scale and source entries commonly share the same color name (e.g. both
    // have "Primary"), so writing both into out.color[cLabel] would silently
    // clobber one with the other.
    const out: Record<string, Record<string, Record<string, Record<string, unknown>>>> & { source?: Record<string, Record<string, unknown>> } = { color: {} };
    const sourceEntries = _eachSourceColor(config);
    if (sourceEntries.length > 0) {
      out.source = {};
      for (const entry of sourceEntries) {
        const cLabel = _slug(entry.cLabel);
        out.source[cLabel] = { base: { value: entry.hex, type: "color", attributes: { category: "color", source: cLabel } } };
        for (const alpha of entry.alphaVariants) {
          const { r, g, b, a } = alpha.rgba;
          (out.source[cLabel] as Record<string, unknown>)["alpha-" + alpha.opacity] = { value: `rgba(${r}, ${g}, ${b}, ${a})`, type: "color", attributes: { category: "color", source: cLabel, opacity: alpha.opacity } };
        }
      }
    }
    for (const step of resolveScaleSteps(result, config)) {
      const cLabel = _slug(step.cLabel);
      if (!out.color[cLabel]) out.color[cLabel] = {};
      const stepKey = _slug(step.stepKey);
      out.color[cLabel][stepKey] = {
        value: step.value,
        type: "color",
        attributes: { category: "color", scale: cLabel, step: stepKey },
      };
    }
    return JSON.stringify(out, null, 2);
  },

  theme(result: EngineResult, tokens: ResolvedToken[], config: ExportConfig, themeName: string): string {
    if (!result.tokens || !result.tokens[themeName]) return "{}";
    const out: Record<string, unknown> = { color: {} };
    for (const token of tokens) {
      if (token.theme !== themeName) continue;
      let sdValue: string;
      if (token.tokenRef) {
        const parts = _splitTokenRef(token.tokenRef);
        sdValue = "{color." + _slug(parts.color) + "." + _slug(parts.step) + "}";
      } else {
        sdValue = token.value;
      }
      const roleObj = (config.roles && config.roles[token.roleId]) || { name: token.roleId, shorthand: token.roleId };
      _setNestedSlug(out.color as Record<string, unknown>, token.segs, {
        value: sdValue,
        type: "color",
        attributes: { category: "color", role: _slug(_roleLabel(roleObj, config)), theme: themeName },
      });
    }
    return JSON.stringify(out, null, 2);
  },
};
