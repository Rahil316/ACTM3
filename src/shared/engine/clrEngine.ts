import { contrastRating, hexToHue, hexToSat, hslToHex, seriesMaker, shortestHueDiff } from "./clrUtils";
import { contrastRatio, hexToOklch, oklchToHex, maxChromaAtLH, hexToHct, hctToHex, lstarFromY, normalizeHex, relLum } from "../colorMath";
import { solveColorForContrast } from "./solverEngine";

import type { ContrastRating } from "./clrUtils";
import type { Color, Theme, Variation, Role, ScaleAlgorithm, SolverMode, ScaleStepToken } from "../types";
import type { SolverResult } from "./solverEngine";

export type { ScaleAlgorithm, SolverMode };
export { solveColorForContrast };
export type { SolverResult };

// variableMaker accepts ProjectStore directly — imported lazily via the type-only
// import below to avoid a circular dependency (shared ← ui).
// The structural subset used by the engine:
//   colors, themes, roles, variations, scaleLength, scaleAlgorithm, pluginMode,
//   scaleSteps, useUniformAlgorithm, algorithmScopeLevel, solverMode
export type EngineInput = {
  colors: Color[];
  themes: Theme[];
  roles: Role[];
  variations: Variation[] | null;
  scaleLength: number;
  scaleAlgorithm: ScaleAlgorithm;
  pluginMode: string;
  scaleSteps?: Array<{ name: string; shorthand: string }> | string[] | null;
  useUniformAlgorithm?: boolean;
  algorithmScopeLevel?: string;
  solverMode?: SolverMode;
};

export interface ContrastInfo {
  ratio: number | null;
  rating: ContrastRating | null;
}

export type ScaleCollection = Record<string, Record<string | number, ScaleStepToken>>;

export interface TokenEntry {
  tokenName: string;
  color: string;
  role: string;
  variation: string;
  roleDescription: string;
  tokenRef: string | null;
  value: string;
  contrast: ContrastInfo;
  contrastTarget?: number;
  isAdjusted?: boolean;
  // Only set when solved via the apca-natural solver mode — contrast.ratio
  // above always stays a genuine WCAG ratio (recomputed from the actual
  // output hex) regardless of solver mode, so every existing consumer of
  // contrast.ratio keeps working unmodified. This is purely additive detail
  // for UI that wants to show what apca-natural actually optimized for.
  achievedLc?: number;
}

export interface EngineErrors {
  critical: unknown[];
  warnings: { color: string; role: string; variation: string; theme: string; warning: string }[];
  notices: { color: string; role: string; variation: string; theme: string; notice: string }[];
}

export interface EngineResult {
  // Absent (not merely empty) in Direct mode — there is no tonal scale to
  // compute at all, so the engine doesn't manufacture a value for a config
  // where scales are structurally meaningless. Present and populated in Scale
  // mode unconditionally, even when includeColorScalesCollection is off — that
  // toggle only controls whether the scale gets PUBLISHED as its own Figma
  // collection; every Scale-mode token is still derived by walking the scale,
  // so the engine always needs to compute it regardless of the publish toggle.
  scales?: ScaleCollection;
  tokens: Record<string, Record<string, Record<number, Record<number, TokenEntry>>>>;
  errors: EngineErrors;
}

// ── COLOR SCALE ALGORITHMS ────────────────────────────────────────────────────

type ScaleExtras = { hexIn: string; uMax: number; uMin: number };
type StepLumFn = (i: number) => number;
type FindLFn = (targetLum: number, getS: (L: number) => number, getH: (L: number) => number) => number;
type AlgoFn = (hue: number, satu: number, N: number, stepLum: StepLumFn, findL: FindLFn, extras: ScaleExtras) => string[];

const TONAL_SCALE_ALGO: Record<ScaleAlgorithm, AlgoFn> = {
  Linear: (hue, satu, N) => {
    const inc = 100 / (N + 1);
    const out: string[] = [];
    for (let i = 1; i <= N; i++) out.push(hslToHex(hue, satu, i * inc) || "#000000");
    return out.reverse();
  },

  Uniform: (hue, satu, N, stepLum, findL) => {
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const L = findL(
        stepLum(i),
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  },

  Natural: (hue, satu, N, stepLum, findL) => {
    const tapS = (L: number) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, () => hue);
      out.push(hslToHex(hue, tapS(L), L) || "#000000");
    }
    return out;
  },

  Expressive: (hue, satu, N, stepLum, findL) => {
    const tapS = (L: number) => satu * (1 - Math.pow(Math.abs(L - 50) / 50, 1.5) * 0.4);
    const shiftH = (L: number) => {
      const d = (L - 50) / 50;
      return (hue + shortestHueDiff(hue, d > 0 ? 60 : 240) * Math.abs(d) * 0.15 + 360) % 360;
    };
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const L = findL(stepLum(i), tapS, shiftH);
      out.push(hslToHex(shiftH(L), tapS(L), L) || "#000000");
    }
    return out;
  },

  Symmetric: (hue, satu, N, _stepLum, findL, { hexIn, uMax, uMin }) => {
    const srcLum = relLum(normalizeHex(hexIn) || "#000000") || 0.18;
    const uSrc = Math.log(srcLum + 0.05);
    const mid = Math.floor((N - 1) / 2);
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      let u: number;
      if (N === 1) u = uSrc;
      else if (i === 0) u = uMax;
      else if (i === N - 1) u = uMin;
      else if (i <= mid && mid > 0) u = uMax - ((uMax - uSrc) * i) / mid;
      else u = uSrc - ((uSrc - uMin) * (i - mid)) / (N - 1 - mid);
      const targetLum = Math.max(0.0001, Math.exp(Math.min(uMax, Math.max(uMin, u))) - 0.05);
      const L = findL(
        targetLum,
        () => satu,
        () => hue,
      );
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  },

  OKLCH: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn) || "#000000");
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 1,
        oL = 0.5;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(oklchToHex(mid, srcC, srcH));
        oL = mid;
        if (Math.abs((lum ?? 0) - targetLum) < 0.0001) break;
        if ((lum ?? 0) < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(oklchToHex(oL, srcC, srcH) || "#000000");
    }
    return out;
  },

  // Tone (CIE L*) and target relative luminance (Y, what stepLum produces)
  // measure the same underlying quantity on two different scales, related by
  // a direct closed-form conversion (lstarFromY) — no search needed to go
  // from one to the other. A small local refinement around that closed-form
  // estimate corrects the tiny residual from Hct's tone-setter internally
  // re-solving chroma at the new tone (which can shift achieved luminance by
  // a hair) without risking the wide, unconstrained bisection this used to
  // do — that older approach could cross a real pole in the CAM16 inverse's
  // chromatic term and converge to a mathematically valid but wrong-hued
  // color; a narrow window around an already-accurate guess cannot.
  Material: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { h: srcH, c: srcC } = hexToHct(normalizeHex(hexIn) || "#000000");
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      const guess = lstarFromY(targetLum * 100);
      let lo = Math.max(0, guess - 2),
        hi = Math.min(100, guess + 2),
        tone = guess;
      for (let j = 0; j < 20; j++) {
        const mid = (lo + hi) / 2;
        const lum = relLum(hctToHex(srcH, srcC, mid));
        tone = mid;
        if (Math.abs((lum ?? 0) - targetLum) < 0.0001) break;
        if ((lum ?? 0) < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(hctToHex(srcH, srcC, tone) || "#000000");
    }
    return out;
  },

  // Holds the seed's chroma as a *fraction of its hue's real max-chroma envelope*
  // (rather than a raw chroma value) constant across lightness — the taper comes
  // from each hue's actual sRGB gamut shape instead of a guessed curve, and is
  // gamut-safe by construction since the fraction is always <= 1. Runs in OKLCH
  // rather than HCT: HCT's inverse transform has a pre-existing hue-stability
  // issue when chroma is pushed toward the gamut boundary away from the seed's
  // own tone (see project notes), which this algorithm deliberately does a lot
  // of — OKLCH stays hue-stable under the same conditions. The seed's own
  // lightness is snapped to whichever step sits closest to it, so the seed's
  // exact hex always appears verbatim in the ramp instead of being approximated.
  Fidelity: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const seedHex = normalizeHex(hexIn) || "#000000";
    const src = hexToOklch(seedHex);
    const envelope = maxChromaAtLH(src.L, src.H);
    const f = envelope > 0.001 ? Math.min(1, src.C / envelope) : 0;

    const srcLum = relLum(seedHex) ?? 0;
    let anchorIdx = 0;
    let anchorDiff = Infinity;
    for (let i = 0; i < N; i++) {
      const diff = Math.abs(stepLum(i) - srcLum);
      if (diff < anchorDiff) {
        anchorDiff = diff;
        anchorIdx = i;
      }
    }

    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      if (i === anchorIdx) {
        out.push(seedHex);
        continue;
      }
      const targetLum = stepLum(i);
      let lo = 0,
        hi = 1,
        L = 0.5;
      for (let j = 0; j < 40; j++) {
        const mid = (lo + hi) / 2;
        const chroma = f * maxChromaAtLH(mid, src.H);
        const lum = relLum(oklchToHex(mid, chroma, src.H));
        L = mid;
        if (Math.abs((lum ?? 0) - targetLum) < 0.0001) break;
        if ((lum ?? 0) < targetLum) lo = mid;
        else hi = mid;
      }
      out.push(oklchToHex(L, f * maxChromaAtLH(L, src.H), src.H) || "#000000");
    }
    return out;
  },
};

export function scaleMaker(hexIn: string, scaleLength: number, scaleAlgo?: ScaleAlgorithm): string[] | null {
  const algo: ScaleAlgorithm = scaleAlgo || "Natural";
  const hue = hexToHue(hexIn);
  const satu = hexToSat(hexIn);
  if (hue === null || satu === null) {
    return null;
  }
  const N = scaleLength;
  const C_max = (21 * N) / (N + 1);
  const uMax = Math.log(0.05 * C_max);
  const uMin = Math.log(1.05 / C_max);

  const stepLum: StepLumFn = (i) => {
    const u = N === 1 ? (uMax + uMin) / 2 : uMax - (i / (N - 1)) * (uMax - uMin);
    return Math.exp(u) - 0.05;
  };

  const findL: FindLFn = (targetLum, getS, getH) => {
    let lo = 0,
      hi = 100,
      L = 50;
    for (let j = 0; j < 30; j++) {
      const mid = (lo + hi) / 2;
      const lum = relLum(hslToHex(getH(mid), getS(mid), mid) ?? "#000000");
      L = mid;
      if (Math.abs((lum ?? 0) - targetLum) < 0.0001) break;
      if ((lum ?? 0) < targetLum) lo = mid;
      else hi = mid;
    }
    return L;
  };

  const strategy = TONAL_SCALE_ALGO[algo] ?? TONAL_SCALE_ALGO.Natural;
  return strategy(hue, satu, N, stepLum, findL, { hexIn, uMax, uMin });
}

// ── TOKEN PIPELINE ────────────────────────────────────────────────────────────

export function variableMaker(config: EngineInput): EngineResult {
  const { colors, themes, scaleLength } = config;
  const errors: EngineErrors = { critical: [], warnings: [], notices: [] };
  const variations: Variation[] = config.variations ?? [];
  const stepNames: string[] | null = !config.scaleSteps ? null : (config.scaleSteps as Array<unknown>).every((s) => typeof s === "string") ? (config.scaleSteps as string[]) : (config.scaleSteps as Array<{ name: string }>).map((s) => s.name);

  const scales: ScaleCollection = config.pluginMode !== "direct" ? _generateScales(colors, scaleLength, config.scaleAlgorithm, stepNames, themes, config.useUniformAlgorithm ?? false, errors) : Object.create(null);

  const tokens: EngineResult["tokens"] = {};
  for (const mode of themes) tokens[mode.name.toLowerCase()] = {};
  for (const mode of themes) {
    const modeName = mode.name.toLowerCase();
    const themeTokens = tokens[modeName];
    for (const color of colors) {
      themeTokens[color.name] = {};
      if (config.pluginMode === "direct") {
        _solveDirectMode(color, mode, config, variations, themeTokens[color.name], errors);
      } else {
        _processScaleMode(color, mode, config, scales, stepNames ?? seriesMaker(scaleLength).map(String), variations, themeTokens[color.name], errors);
      }
      // A color with every role scoped away from it (e.g. a source-only "spare"
      // swatch) legitimately produces zero tokens — drop the empty bucket rather
      // than keep a {} entry with nothing in it, so consumers (Preview, Figma
      // sync, Health) never have to special-case "present but empty" vs. "absent".
      if (Object.keys(themeTokens[color.name]).length === 0) {
        delete themeTokens[color.name];
      }
    }
  }
  // Omit entirely in Direct mode — see EngineResult.scales's doc comment.
  return config.pluginMode === "direct" ? { tokens, errors } : { scales, tokens, errors };
}

function _generateScales(colors: Color[], scaleLength: number, scaleAlgo: ScaleAlgorithm, stepNames: string[] | null | undefined, themes: Theme[], useUniformAlgorithm: boolean, errors: EngineErrors): ScaleCollection {
  const collection: ScaleCollection = Object.create(null);
  const names: string[] = stepNames || seriesMaker(scaleLength).map(String);
  const themeBgs = themes.map((t) => ({ key: t.name.toLowerCase(), bg: normalizeHex(t.bg) || "#FFFFFF" }));
  for (const color of colors) {
    const colorAlgo = !useUniformAlgorithm && color.scaleAlgorithm ? color.scaleAlgorithm : scaleAlgo;
    const scaleData = scaleMaker(color.value, scaleLength, colorAlgo);
    if (scaleData === null) {
      errors.critical.push(`Color "${color.name}" has an invalid hex value "${color.value}" — scale generation aborted for this color.`);
      continue;
    }
    const scale: Record<string | number, ScaleStepToken> = Object.create(null);
    collection[color.name] = scale;
    for (let i = 0; i < scaleLength; i++) {
      const value = normalizeHex(scaleData[i]) || "#000000";
      const step = names[i];
      const contrast: Record<string, ContrastInfo> = {};
      for (const { key, bg } of themeBgs) {
        contrast[key] = { ratio: contrastRatio(value, bg), rating: contrastRating(value, bg) };
      }
      scale[step] = {
        value,
        stepName: `${color.name}-${step}`,
        shorthand: `${color.shorthand}-${step}`,
        description: color.description || "",
        contrast,
      };
    }
  }
  return collection;
}

function _getSolverMode(config: EngineInput, color: Color, role: Role | null): SolverMode {
  if (config.useUniformAlgorithm !== false) return config.solverMode || "natural";
  if (config.algorithmScopeLevel === "role") return (role && role.solverMode) || config.solverMode || "natural";
  return color.solverMode || config.solverMode || "natural";
}

function _solveDirectMode(color: Color, mode: Theme, config: EngineInput, globalVariations: Variation[], groupOutput: Record<number, Record<number, TokenEntry>>, errors: EngineErrors): void {
  const modeName = mode.name.toLowerCase();

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    if (role.scopedColorIds != null && !role.scopedColorIds.includes(color._id || color.name)) continue;
    const perColorBg = role.localBgPerColor?.[color.name] ?? role.localBgPerColor?.[color._id ?? ""];
    const bgHex = (perColorBg && perColorBg[modeName]) ?? (role.localBgResolved && role.localBgResolved[modeName]) ?? mode.bg;
    const roleOutput: Record<number, TokenEntry> = (groupOutput[ri] = {});
    const solverMode = _getSolverMode(config, color, role);
    const roleVariations = role.variations ?? globalVariations;

    roleVariations.forEach((v, vi) => {
      const targetContrast = v.target ?? [1.5, 3, 4.5, 7, 12][vi] ?? 4.5;
      const variation = v.name ?? String(vi);
      const solved = solveColorForContrast(color.value, targetContrast, bgHex, solverMode);
      if (solved.warning) errors.warnings.push({ color: color.name, role: role.name, variation, theme: modeName, warning: solved.warning });
      if (solved.chromaReduced) errors.notices.push({ color: color.name, role: role.name, variation, theme: modeName, notice: "Chroma reduced to fit gamut." });
      // solved.achievedContrast is in Lc units (not WCAG) for apca-natural —
      // always recompute the genuine WCAG ratio for contrast.ratio/isAdjusted
      // so every downstream consumer (health report, preview screens, dev
      // overlay) keeps treating this field as WCAG-scale unconditionally.
      const wcagRatio = solved.metric === "apca" ? (contrastRatio(solved.hex, bgHex) ?? 0) : solved.achievedContrast;
      roleOutput[vi] = {
        tokenName: `${color.name}/${role.name}/${variation}`,
        color: color.name,
        role: role.name,
        variation,
        roleDescription: role.description || "",
        tokenRef: null,
        value: solved.hex,
        contrast: { ratio: wcagRatio, rating: contrastRating(solved.hex, bgHex) },
        contrastTarget: targetContrast,
        isAdjusted: solved.clipped || wcagRatio > targetContrast + 0.3,
        ...(solved.metric === "apca" ? { achievedLc: solved.achievedContrast } : {}),
      };
    });
  }
}

function _processScaleMode(color: Color, mode: Theme, config: EngineInput, scales: ScaleCollection, stepNames: string[], globalVariations: Variation[], groupOutput: Record<number, Record<number, TokenEntry>>, errors: EngineErrors): void {
  const modeName = mode.name.toLowerCase();
  const scale = scales[color.name];

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    if (role.scopedColorIds != null && !role.scopedColorIds.includes(color._id || color.name)) continue;
    const perColorBg = role.localBgPerColor?.[color.name] ?? role.localBgPerColor?.[color._id ?? ""];
    const effectiveBg = (perColorBg && perColorBg[modeName]) ?? (role.localBgResolved && role.localBgResolved[modeName]) ?? mode.bg;
    const isDark = (relLum(normalizeHex(effectiveBg) || "#FFFFFF") ?? 1) < 0.4;
    const roleOutput: Record<number, TokenEntry> = (groupOutput[ri] = {});
    const roleVariations = role.variations ?? globalVariations;

    _mapByScaleContrast(color, role, roleVariations, scale, stepNames, modeName, effectiveBg, isDark, roleOutput, errors);
  }
}

function _mapByScaleContrast(
  color: Color,
  role: Role,
  variations: Variation[],
  scale: Record<string | number, ScaleStepToken>,
  stepNames: string[],
  modeName: string,
  effectiveBg: string,
  isDark: boolean,
  output: Record<number, TokenEntry>,
  errors: EngineErrors,
): void {
  // effectiveBg is already resolved: localBgPerColor > localBg > theme.bg.
  // Always contrast against it — no flag needed.
  const getContrast = (step: string | number): number => contrastRatio(scale[step].value, effectiveBg) ?? 0;

  variations.forEach((v, vi) => {
    const variation = v.name ?? String(vi);
    const target = v.target ?? 4.5;
    let bestIdx = isDark ? stepNames.length - 1 : 0;
    let found = false;
    if (isDark) {
      for (let i = stepNames.length - 1; i >= 0; i--) {
        if (getContrast(stepNames[i]) >= target) {
          bestIdx = i;
          found = true;
          break;
        }
      }
    } else {
      for (let i = 0; i < stepNames.length; i++) {
        if (getContrast(stepNames[i]) >= target) {
          bestIdx = i;
          found = true;
          break;
        }
      }
    }
    if (!found) {
      let maxC = -1;
      stepNames.forEach((n, i) => {
        const c = getContrast(n);
        if (c > maxC) {
          maxC = c;
          bestIdx = i;
        }
      });
      errors.warnings.push({ color: color.name, role: role.name, variation, theme: modeName, warning: `Target contrast ${target} not achievable. Using closest (${maxC.toFixed(2)}).` });
    }
    const data = scale[stepNames[bestIdx]];
    const achievedContrast = contrastRatio(data.value, effectiveBg) ?? 0;
    output[vi] = {
      tokenName: `${color.name}-${role.name}-${variation}`,
      color: color.name,
      role: role.name,
      variation,
      roleDescription: role.description || "",
      tokenRef: data.stepName,
      value: data.value,
      contrast: { ratio: achievedContrast, rating: contrastRating(data.value, effectiveBg) },
      contrastTarget: target,
      isAdjusted: !found,
    };
  });
}

export function validateVariationContrasts(targets: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (let i = 1; i < targets.length; i++) {
    if (targets[i] <= targets[i - 1]) errors.push(`Variation ${i + 1} (${targets[i]}) must be greater than variation ${i} (${targets[i - 1]}).`);
  }
  return { valid: errors.length === 0, errors };
}
