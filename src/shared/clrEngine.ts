import { contrastRating, hexToHue, hexToSat, hslToHex, seriesMaker, shortestHueDiff, srgbLinearize } from "./clrUtils";
import { contrastRatio, hexToOklch, oklchToHex, maxChromaAtLH, hexToHct, hctToHex, lstarFromY, normalizeHex, relLum } from "./colorMath";

import type { ContrastRating } from "./clrUtils";
import type { Color, Theme, Variation, Role, ScaleAlgorithm, SolverMode, ScaleStepToken } from "./types";

export type { ScaleAlgorithm, SolverMode };

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
}

export interface EngineErrors {
  critical: unknown[];
  warnings: { color: string; role: string; variation: string; theme: string; warning: string }[];
  notices: { color: string; role: string; variation: string; theme: string; notice: string }[];
}

export interface EngineResult {
  scales: ScaleCollection;
  tokens: Record<string, Record<string, Record<number, Record<number, TokenEntry>>>>;
  errors: EngineErrors;
}

// ── SOLVER CONSTANTS ──────────────────────────────────────────────────────────

const SOLVER_MODES: SolverMode[] = ["natural", "constant-chroma", "symmetric", "hue-locked", "max-chroma"];
const OVERSHOOT_WARN = 0.3;
const MAX_ITER = 60;
const L_EPS = 1e-5;

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
    }
  }
  return { scales, tokens, errors };
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
      roleOutput[vi] = {
        tokenName: `${color.name}/${role.name}/${variation}`,
        color: color.name,
        role: role.name,
        variation,
        roleDescription: role.description || "",
        tokenRef: null,
        value: solved.hex,
        contrast: { ratio: solved.achievedContrast, rating: contrastRating(solved.hex, bgHex) },
        contrastTarget: targetContrast,
        isAdjusted: solved.clipped || solved.achievedContrast > targetContrast + 0.3,
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

// ── COLOR SPACES ──────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function _h2lr(hex: string): Vec3 {
  const n = parseInt((normalizeHex(hex) || "#000000").replace("#", ""), 16);
  return [srgbLinearize((n >> 16) & 255), srgbLinearize((n >> 8) & 255), srgbLinearize(n & 255)];
}

// ── CONTRAST SOLVER ───────────────────────────────────────────────────────────
//
// _relLumFromLinear/_wcagContrast/_lumOfHex are a second, private luminance
// implementation kept deliberately separate from colorMath's relLum —
// benchmarked directly: colorMath's culori-backed relLum is ~7x slower per
// call (general-purpose parse/mode-conversion overhead vs. this tight inline
// calculation), and _searchL below calls this on every one of its up to 60
// bisection iterations, for every color/role/variation/theme combination in
// a full variableMaker() run. Not migrated; kept as a documented,
// performance-motivated exception rather than a leftover oversight.

function _relLumFromLinear(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _wcagContrast(lum1: number, lum2: number): number {
  const hi = Math.max(lum1, lum2),
    lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

function _lumOfHex(hex: string): number {
  const [r, g, b] = _h2lr(hex);
  return _relLumFromLinear(r, g, b);
}

function _targetChroma(L: number, srcL: number, srcC: number, _srcH: number, mode: SolverMode): number {
  if (srcC < 0.001) return 0;
  switch (mode) {
    case "constant-chroma":
      return srcC;
    case "symmetric":
      return srcC * (1 - Math.pow(Math.abs(2 * L - 1), 1.5));
    case "natural":
      return (srcC / Math.max(srcL, 1 - srcL)) * Math.min(L, 1 - L);
    default:
      return srcC;
  }
}

function _searchL(bgLum: number, targetContrast: number, lo: number, hi: number, getHexAtL: (L: number) => string | null): number | null {
  let bestL: number | null = null;
  let failedConversions = 0;
  for (let i = 0; i < MAX_ITER; i++) {
    if (hi - lo < L_EPS) break;
    const mid = (lo + hi) / 2;
    const hex = getHexAtL(mid);
    if (!hex) {
      if (++failedConversions > 8) {
        console.warn("_searchL: too many failed hex conversions, aborting search");
        break;
      }
      lo = mid;
      continue;
    }
    const contrast = _wcagContrast(_lumOfHex(hex), bgLum);
    if (contrast >= targetContrast) {
      bestL = mid;
      if (bgLum > 0.5) lo = mid;
      else hi = mid;
    } else {
      if (bgLum > 0.5) hi = mid;
      else lo = mid;
    }
  }
  return bestL;
}

export interface SolverResult {
  hex: string;
  achievedContrast: number;
  solverMode: SolverMode;
  chromaReduced: boolean;
  clipped: boolean;
  warning: string | null;
}

export function solveColorForContrast(sourceHex: string, targetContrast: number, bgHex: string, solverMode: SolverMode | string): SolverResult {
  const mode: SolverMode = SOLVER_MODES.includes(solverMode as SolverMode) ? (solverMode as SolverMode) : "natural";
  const src = hexToOklch(sourceHex);
  const bgLum = _lumOfHex(bgHex);
  const bgIsLight = bgLum > 0.18;

  const maxTheoreticalContrast = _wcagContrast(bgLum, bgIsLight ? 0 : 1);
  if (targetContrast > maxTheoreticalContrast + 0.01) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return {
      hex: fallback,
      achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)),
      solverMode: mode,
      chromaReduced: true,
      clipped: true,
      warning: `Target contrast ${targetContrast} is unreachable against this background (max ${maxTheoreticalContrast.toFixed(2)}). Black/white used.`,
    };
  }

  const lLow = 0.001,
    lHigh = 0.999;
  let solvedL: number | null = null,
    solvedC: number | null = null,
    chromaReduced = false;

  if (mode === "max-chroma") {
    const getHex = (L: number) => {
      const maxC = Math.min(Math.max(src.C, 0.2), maxChromaAtLH(L, src.H));
      return oklchToHex(L, maxC < 0.001 ? 0 : maxC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) solvedC = Math.min(Math.max(src.C, 0.2), maxChromaAtLH(solvedL, src.H));
  } else if (mode === "hue-locked") {
    const getHex = (L: number) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, "natural");
      return oklchToHex(L, Math.min(rawC, maxChromaAtLH(L, src.H)), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, "natural");
      solvedC = Math.min(rawC, maxChromaAtLH(solvedL, src.H));
      if (solvedC < src.C - 0.01) chromaReduced = true;
    }
  } else {
    const getHex = (L: number) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, mode);
      return oklchToHex(L, Math.min(rawC, maxChromaAtLH(L, src.H)), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, mode);
      solvedC = Math.min(rawC, maxChromaAtLH(solvedL, src.H));
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
    }
  }

  if (solvedL === null) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return {
      hex: fallback,
      achievedContrast: parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2)),
      solverMode: mode,
      chromaReduced: true,
      clipped: true,
      warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.`,
    };
  }

  const resultHex = oklchToHex(solvedL, solvedC || 0, src.H);
  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));
  // achievedContrast is rounded to 2dp above; round targetContrast the same way
  // before comparing so rounding alone can't produce a spurious shortfall warning.
  const roundedTarget = parseFloat(targetContrast.toFixed(2));
  let warning: string | null = null;
  if (achievedContrast < roundedTarget) warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
  else if (achievedContrast > targetContrast + OVERSHOOT_WARN) warning = `Target ${targetContrast} not achievable precisely; nearest is ${achievedContrast} (overshoot ${(achievedContrast - targetContrast).toFixed(2)}).`;

  return { hex: resultHex, achievedContrast, solverMode: mode, chromaReduced, clipped: false, warning };
}

export function validateVariationContrasts(targets: number[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (let i = 1; i < targets.length; i++) {
    if (targets[i] <= targets[i - 1]) errors.push(`Variation ${i + 1} (${targets[i]}) must be greater than variation ${i} (${targets[i - 1]}).`);
  }
  return { valid: errors.length === 0, errors };
}
