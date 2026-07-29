import type { EngineResult, ExportConfig, TokenEntry, Role } from './types';
import type { ContrastInfo } from '../engine/clrEngine';
import { _colorLabel, _roleLabel, _varLabel, _stepLabel, _tokenSegmentsTyped, _variationDefs, _slug } from './helpers';

export type TokenSegment = { type: "color" | "role" | "variation"; label: string };

export interface ResolvedToken {
  theme: string;
  segs: TokenSegment[]; // already in tokenNameSegments order/omission
  value: string;
  tokenRef: string | null;
  isAdjusted?: boolean;
  contrast: ContrastInfo;
  colorName: string; // raw (unlabeled) identity — for formatters that group/key by original name
  roleId: string;
}

export interface ResolvedScaleStep {
  colorName: string;
  cLabel: string;
  stepKey: string; // already through _stepLabel
  value: string;
  description: string;
}

export interface ResolveWarning {
  code: "empty-theme" | "role-no-variations" | "duplicate-token-name";
  message: string;
  theme?: string;
  colorName?: string;
  roleId?: string;
}

export interface ResolveResult {
  tokens: ResolvedToken[];
  scaleSteps: ResolvedScaleStep[];
  warnings: ResolveWarning[];
}

// Single place that turns raw EngineResult + ExportConfig into fully-labeled,
// segment-ordered records — every formatter in fmt*.ts reads from this
// instead of independently calling _colorLabel/_roleLabel/_varLabel/
// _tokenSegmentsTyped itself. See Documentations knowledge on the
// tokenNameSegments bug this replaced: three formatters used to silently
// ignore segment order because each formatter re-derived naming on its own.
export function resolveExport(result: EngineResult, config: ExportConfig): ResolveResult {
  const tokens: ResolvedToken[] = [];
  const warnings: ResolveWarning[] = [];
  const themeKeys = Object.keys(result.tokens || {});
  const seenNames = new Map<string, Set<string>>(); // theme -> set of joined segment labels

  for (const theme of themeKeys) {
    const themeTokens = result.tokens[theme];
    if (!themeTokens) continue;
    const colorNames = Object.keys(themeTokens);
    let themeTokenCount = 0;

    for (const colorName of colorNames) {
      const cLabel = _colorLabel(colorName, config);
      const roles = themeTokens[colorName] as Record<string, Record<string, TokenEntry>>;
      const roleIds = Object.keys(roles);

      for (const roleId of roleIds) {
        const roleObj: Role = (config.roles && config.roles[roleId]) || { _id: roleId, name: roleId, shorthand: roleId, variations: null };
        const rLabel = _roleLabel(roleObj, config);
        // Only an explicit empty array is a real anomaly — null/undefined
        // means "use the shared/default variation list" (see Role.variations'
        // own doc comment in shared/types.ts) and is the normal case.
        if (Array.isArray(roleObj.variations) && roleObj.variations.length === 0) {
          warnings.push({ code: "role-no-variations", message: `Role "${roleObj.name}" has an explicit empty variations list — no tokens will be produced for it under color "${colorName}".`, theme, colorName, roleId });
        }
        const varDefs = _variationDefs(roleObj, config);
        const variations = roles[roleId];

        for (let vi = 0; vi < varDefs.length; vi++) {
          const token = variations[String(vi)];
          if (!token) continue; // this role has fewer variations than another — expected, not an anomaly
          const vLabel = _varLabel(varDefs[vi], config);
          const segs = _tokenSegmentsTyped(cLabel, rLabel, vLabel, config);

          const joined = segs.map((s) => _slug(s.label)).join("/");
          let themeNames = seenNames.get(theme);
          if (!themeNames) { themeNames = new Set(); seenNames.set(theme, themeNames); }
          if (themeNames.has(joined)) {
            warnings.push({ code: "duplicate-token-name", message: `Multiple tokens resolve to the same name "${joined}" in theme "${theme}" — a later token will overwrite an earlier one in any format that keys by name.`, theme, colorName, roleId });
          } else {
            themeNames.add(joined);
          }

          tokens.push({
            theme,
            segs,
            value: token.value,
            tokenRef: token.tokenRef,
            isAdjusted: token.isAdjusted,
            contrast: token.contrast,
            colorName,
            roleId,
          });
          themeTokenCount++;
        }
      }
    }

    if (themeTokenCount === 0) {
      warnings.push({ code: "empty-theme", message: `Theme "${theme}" resolved zero tokens.`, theme });
    }
  }

  return { tokens, scaleSteps: resolveScaleSteps(result, config), warnings };
}

export function resolveScaleSteps(result: EngineResult, config: ExportConfig): ResolvedScaleStep[] {
  const out: ResolvedScaleStep[] = [];
  // includeColorScalesCollection off means "don't publish the scale as its own
  // collection/section" — checked here once so every caller (formatter or
  // resolveExport itself) gets an empty list instead of each re-deriving this
  // same condition (previously duplicated across fmtAndroid/fmtReactNative/
  // fmtSwift/fmtTailwind, in addition to bundler.ts's own hasScales gate on
  // whether to call a scale-producing method at all).
  if (config.includeColorScalesCollection === false) return out;
  const scales = result.scales ?? {};
  for (const colorName of Object.keys(scales)) {
    const cLabel = _colorLabel(colorName, config);
    const scale = scales[colorName];
    for (const step of Object.keys(scale)) {
      const entry = scale[step];
      out.push({
        colorName,
        cLabel,
        stepKey: _stepLabel(step, config),
        value: entry.value,
        description: entry.description,
      });
    }
  }
  return out;
}
