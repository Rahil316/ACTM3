import {
  contrastRating,
  contrastRatio,
  hexToHue,
  hexToSat,
  hslToHex,
  normalizeHex,
  relLum,
  seriesMaker,
  shortestHueDiff,
  srgbDelinearize,
  srgbLinearize,
} from "./clrUtils";

import type { ContrastRating } from "./clrUtils";

// ── Public types ──────────────────────────────────────────────────────────────

export type ScaleAlgorithm = "Linear" | "Uniform" | "Natural" | "Expressive" | "Symmetric" | "OKLCH" | "Material";
export type SolverMode = "natural" | "saturated" | "luminance" | "hue-locked" | "chroma-maximized";

export interface EngineColor {
  name: string;
  shorthand: string;
  value: string;
  _id?: string;
  description?: string;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
}

export interface EngineTheme {
  name: string;
  bg: string;
}

export interface EngineVariation {
  name: string;
  shorthand?: string;
}

export interface EngineRole {
  name: string;
  shorthand?: string;
  description?: string;
  mappingMethod?: "contrast" | "index";
  variationTargets?: number[];
  customVariationList?: boolean;
  customVariations?: EngineVariation[];
  solverMode?: SolverMode;
  scaleAlgorithm?: ScaleAlgorithm;
  scopedColorIds?: string[] | null;
  localBg?: Record<string, string> | null;                        // theme-name → resolved hex (hex/color/fixed-token kinds)
  localBgTokenRef?: string | null;                               // fixed token ref — resolved post-engine pass-1
  localBgDynamicRef?: string | null;                             // dynamic token ref with [color] placeholder — resolved post-engine pass-1
  localBgPerColor?: Record<string, Record<string, string>> | null; // colorName → { theme-name → hex } (dynamic token kind)
}

export interface EngineConfig {
  colors: EngineColor[];
  themes: EngineTheme[];
  roles: EngineRole[];
  variations: EngineVariation[];
  scaleLength: number;
  scaleAlgorithm: ScaleAlgorithm;
  scaleStepNames?: (string | number)[];
  pluginMode: "scale" | "direct";
  useUniformAlgorithm?: boolean;
  algorithmScopeLevel?: "color" | "role";
  solverMode?: SolverMode;
}

export interface ContrastInfo {
  ratio: number | null;
  rating: ContrastRating | null;
}

export interface ScaleStep {
  value: string;
  stepName: string;
  shorthand: string;
  description: string;
  contrast: Record<string, ContrastInfo>;
}

export type ScaleCollection = Record<string, Record<string | number, ScaleStep>>;

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

const SOLVER_MODES: SolverMode[] = ["natural", "saturated", "luminance", "hue-locked", "chroma-maximized"];
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
      const L = findL(stepLum(i), () => satu, () => hue);
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
      const L = findL(targetLum, () => satu, () => hue);
      out.push(hslToHex(hue, satu, L) || "#000000");
    }
    return out;
  },

  OKLCH: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { C: srcC, H: srcH } = hexToOklch(normalizeHex(hexIn) || "#000000");
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0, hi = 1, oL = 0.5;
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

  Material: (_hue, _satu, N, stepLum, _findL, { hexIn }) => {
    const { h: srcH, c: srcC } = hexToHct(normalizeHex(hexIn) || "#000000");
    const out: string[] = [];
    for (let i = 0; i < N; i++) {
      const targetLum = stepLum(i);
      let lo = 0, hi = 100, tone = 50;
      for (let j = 0; j < 40; j++) {
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
    let lo = 0, hi = 100, L = 50;
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

export function variableMaker(config: EngineConfig): EngineResult {
  const { colors, themes, scaleLength } = config;
  const errors: EngineErrors = { critical: [], warnings: [], notices: [] };

  const scales: ScaleCollection =
    config.pluginMode !== "direct"
      ? _generateScales(colors, scaleLength, config.scaleAlgorithm, config.scaleStepNames, themes, config.useUniformAlgorithm ?? false, errors)
      : Object.create(null);

  const tokens: EngineResult["tokens"] = {};
  for (const mode of themes) tokens[mode.name.toLowerCase()] = {};
  for (const mode of themes) {
    const modeName = mode.name.toLowerCase();
    const themeTokens = tokens[modeName];
    for (const color of colors) {
      themeTokens[color.name] = {};
      if (config.pluginMode === "direct") {
        _solveDirectMode(color, mode, config, themeTokens[color.name], errors);
      } else {
        _processScaleMode(color, mode, config, scales, themeTokens[color.name], errors);
      }
    }
  }
  return { scales, tokens, errors };
}

function _generateScales(
  colors: EngineColor[],
  scaleLength: number,
  scaleAlgo: ScaleAlgorithm,
  stepNames: (string | number)[] | undefined,
  themes: EngineTheme[],
  useUniformAlgorithm: boolean,
  errors: EngineErrors,
): ScaleCollection {
  const collection: ScaleCollection = Object.create(null);
  const names = stepNames || seriesMaker(scaleLength);
  const themeBgs = themes.map((t) => ({ key: t.name.toLowerCase(), bg: normalizeHex(t.bg) || "#FFFFFF" }));
  for (const color of colors) {
    const colorAlgo = !useUniformAlgorithm && color.scaleAlgorithm ? color.scaleAlgorithm : scaleAlgo;
    const scaleData = scaleMaker(color.value, scaleLength, colorAlgo);
    if (scaleData === null) {
      errors.critical.push(`Color "${color.name}" has an invalid hex value "${color.value}" — scale generation aborted for this color.`);
      continue;
    }
    const scale: Record<string | number, ScaleStep> = Object.create(null);
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

function _getSolverMode(config: EngineConfig, color: EngineColor, role: EngineRole | null): SolverMode {
  if (config.useUniformAlgorithm !== false) return config.solverMode || "natural";
  if (config.algorithmScopeLevel === "role") return (role && role.solverMode) || config.solverMode || "natural";
  return color.solverMode || config.solverMode || "natural";
}

function _solveDirectMode(
  color: EngineColor,
  mode: EngineTheme,
  config: EngineConfig,
  groupOutput: Record<number, Record<number, TokenEntry>>,
  errors: EngineErrors,
): void {
  const modeName = mode.name.toLowerCase();

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    if (role.scopedColorIds != null && !role.scopedColorIds.includes(color._id || color.name)) continue;
    const perColorBg = role.localBgPerColor?.[color.name] ?? role.localBgPerColor?.[color._id ?? ''];
    const bgHex = (perColorBg && perColorBg[modeName]) ?? (role.localBg && role.localBg[modeName]) ?? mode.bg;
    const roleOutput: Record<number, TokenEntry> = (groupOutput[ri] = {});
    const solverMode = _getSolverMode(config, color, role);
    const variations =
      role.customVariationList && role.customVariations && role.customVariations.length
        ? role.customVariations
        : config.variations;
    const targets = role.variationTargets || variations.map((_, i) => [1.5, 3, 4.5, 7, 12][i] || 1.5 + i * 1.5);

    targets.forEach((targetContrast, vi) => {
      const variation = variations[vi]?.name ?? String(vi);
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

function _processScaleMode(
  color: EngineColor,
  mode: EngineTheme,
  config: EngineConfig,
  scales: ScaleCollection,
  groupOutput: Record<number, Record<number, TokenEntry>>,
  errors: EngineErrors,
): void {
  const modeName = mode.name.toLowerCase();
  const scale = scales[color.name];
  const stepNames = config.scaleStepNames || seriesMaker(config.scaleLength);

  for (let ri = 0; ri < config.roles.length; ri++) {
    const role = config.roles[ri];
    if (role.scopedColorIds != null && !role.scopedColorIds.includes(color._id || color.name)) continue;
    const perColorBg = role.localBgPerColor?.[color.name] ?? role.localBgPerColor?.[color._id ?? ''];
    const effectiveBg = (perColorBg && perColorBg[modeName]) ?? (role.localBg && role.localBg[modeName]) ?? mode.bg;
    const isDark = (relLum(normalizeHex(effectiveBg) || "#FFFFFF") ?? 1) < 0.4;
    const roleOutput: Record<number, TokenEntry> = (groupOutput[ri] = {});
    const variations =
      role.customVariationList && role.customVariations && role.customVariations.length
        ? role.customVariations
        : config.variations;

    if (role.mappingMethod === "index") {
      _mapByIndex(color, role, variations, scale, stepNames, modeName, roleOutput);
    } else {
      _mapByScaleContrast(color, role, variations, scale, stepNames, modeName, effectiveBg, isDark, roleOutput, errors);
    }
  }
}

function _mapByIndex(
  color: EngineColor,
  role: EngineRole,
  variations: EngineVariation[],
  scale: Record<string | number, ScaleStep>,
  stepNames: (string | number)[],
  modeName: string,
  output: Record<number, TokenEntry>,
): void {
  const targets = role.variationTargets || variations.map((_, i) => Math.floor((stepNames.length * i) / Math.max(1, variations.length - 1)));
  variations.forEach((_, vi) => {
    const idx = Math.max(0, Math.min(stepNames.length - 1, parseInt(String(targets[vi]), 10) || 0));
    const data = scale[stepNames[idx]];
    const variation = variations[vi]?.name ?? String(vi);
    output[vi] = {
      tokenName: `${color.name}-${role.name}-${variation}`,
      color: color.name,
      role: role.name,
      variation,
      roleDescription: role.description || "",
      tokenRef: data.stepName,
      value: data.value,
      contrast: { ratio: data.contrast[modeName].ratio, rating: data.contrast[modeName].rating },
    };
  });
}

function _mapByScaleContrast(
  color: EngineColor,
  role: EngineRole,
  variations: EngineVariation[],
  scale: Record<string | number, ScaleStep>,
  stepNames: (string | number)[],
  modeName: string,
  effectiveBg: string,
  isDark: boolean,
  output: Record<number, TokenEntry>,
  errors: EngineErrors,
): void {
  // effectiveBg is already resolved: localBgPerColor > localBg > theme.bg.
  // Always contrast against it — no flag needed.
  const getContrast = (step: string | number): number =>
    contrastRatio(scale[step].value, effectiveBg) ?? 0;

  variations.forEach((_, vi) => {
    const variation = variations[vi]?.name ?? String(vi);
    const target = parseFloat(String(role.variationTargets && role.variationTargets[vi])) || 4.5;
    let bestIdx = isDark ? stepNames.length - 1 : 0;
    let found = false;
    if (isDark) {
      for (let i = stepNames.length - 1; i >= 0; i--) {
        if (getContrast(stepNames[i]) >= target) { bestIdx = i; found = true; break; }
      }
    } else {
      for (let i = 0; i < stepNames.length; i++) {
        if (getContrast(stepNames[i]) >= target) { bestIdx = i; found = true; break; }
      }
    }
    if (!found) {
      let maxC = -1;
      stepNames.forEach((n, i) => {
        const c = getContrast(n);
        if (c > maxC) { maxC = c; bestIdx = i; }
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
type Mat3 = [Vec3, Vec3, Vec3];

function _h2lr(hex: string): Vec3 {
  const n = parseInt((normalizeHex(hex) || "#000000").replace("#", ""), 16);
  return [srgbLinearize((n >> 16) & 255), srgbLinearize((n >> 8) & 255), srgbLinearize(n & 255)];
}

function _lr2h(r: number, g: number, b: number): string {
  const cl = (v: number) => srgbDelinearize(Math.max(0, v));
  return "#" + [cl(r), cl(g), cl(b)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function _m3(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

const _M1: Mat3 = [
  [0.4122214708, 0.5363325363, 0.0514459929],
  [0.2119034982, 0.6806995451, 0.1073969566],
  [0.0883024619, 0.2817188376, 0.6299787005],
];
const _M1i: Mat3 = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];
const _M2: Mat3 = [
  [0.2104542553, 0.793617785, -0.0040720468],
  [1.9779984951, -2.428592205, 0.4505937099],
  [0.0259040371, 0.7827717662, -0.808675766],
];
const _M2i: Mat3 = [
  [1.0, 0.3963377774, 0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.291485548],
];

export interface OklchColor { L: number; C: number; H: number }

export function hexToOklch(hex: string): OklchColor {
  const [r, g, b] = _h2lr(hex);
  const lms = _m3(_M1, [r, g, b]).map((v) => Math.cbrt(Math.max(0, v))) as Vec3;
  const [L, a, b2] = _m3(_M2, lms);
  return { L, C: Math.sqrt(a * a + b2 * b2), H: ((Math.atan2(b2, a) * 180) / Math.PI + 360) % 360 };
}

export function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const [r, g, bl] = _m3(_M1i, _m3(_M2i, [L, a, b]).map((v) => v * v * v) as Vec3);
  return _lr2h(r, g, bl);
}

// ── HCT ───────────────────────────────────────────────────────────────────────

const _LX: Mat3 = [
  [0.4123907993, 0.3575843394, 0.1804807884],
  [0.2126390059, 0.7151686788, 0.0721923154],
  [0.0193308187, 0.1191947798, 0.9505321522],
];
const _XL: Mat3 = [
  [3.2409699419, -1.5373831776, -0.4986107603],
  [-0.9692436363, 1.8759675015, 0.0415550574],
  [0.0556300797, -0.2039769589, 1.0569715142],
];

interface ViewingConditions {
  F: number; c: number; Nc: number; Nbb: number; Ncb: number;
  FL: number; n: number; z: number; Aw: number; D: number;
  Drgb: number[];
  hpe: Mat3; cat: Mat3; ci: Mat3; hpi: Mat3;
  ad: (c2: number) => number;
}

const _VC: ViewingConditions = (() => {
  const W: Vec3 = [95.047, 100, 108.883];
  const aL = (200 / Math.PI) * Math.pow(66 / 116, 3);
  const F = 1, c = 0.69, Nc = 1;
  const k = 1 / (5 * aL + 1);
  const FL = 0.2 * k ** 4 * (5 * aL) + 0.1 * (1 - k ** 4) ** 2 * (5 * aL) ** (1 / 3);
  const n = Math.pow(66 / 116, 3);
  const z = 1.48 + Math.sqrt(50 * n), Nbb = 0.725 / n ** 0.2, Ncb = Nbb;
  const hpe: Mat3 = [[0.38971, 0.68898, -0.07868], [-0.22981, 1.1834, 0.04641], [0, 0, 1]];
  const cat: Mat3 = [[0.7328, 0.4296, -0.1624], [-0.7036, 1.6975, 0.0061], [0.003, 0.0136, 0.9834]];
  const ci: Mat3 = [[1.0961238208, -0.2788690002, 0.1827452039], [0.4543690419, 0.4735331543, 0.0720978039], [-0.0096276087, -0.0056980312, 1.0153256399]];
  const hpi: Mat3 = [[1.9101968341, -1.1121238928, 0.2019079568], [0.3709500882, 0.6290542574, -0.0000080551], [0, 0, 1]];
  const m3 = (m: Mat3, v: Vec3): Vec3 => [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
  const D = F * (1 - (1 / 3.6) * Math.exp((-aL - 42) / 92));
  const rW = m3(cat, W.map((v) => v / 100) as Vec3);
  const Drgb = rW.map((v) => D / v + 1 - D);
  const ad = (c2: number) => {
    const f = (FL * Math.abs(c2)) ** 0.42;
    return (400 * Math.sign(c2) * f) / (f + 27.13);
  };
  const aW = m3(hpe, m3(ci, rW.map((v, i) => v * Drgb[i]) as Vec3)).map(ad);
  return { F, c, Nc, Nbb, Ncb, FL, n, z, Aw: (2 * aW[0] + aW[1] + 0.05 * aW[2] - 0.305) * Nbb, D, Drgb, hpe, cat, ci, hpi, ad };
})();

export interface HctColor { h: number; c: number; t: number }

function _x2hct(X: number, Y: number, Z: number): HctColor {
  const v = _VC;
  const m3 = (m: Mat3, v2: Vec3): Vec3 => [
    m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2],
    m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2],
    m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2],
  ];
  const rgb = m3(v.cat, [X, Y, Z]).map((c2, i) => c2 * v.Drgb[i]) as Vec3;
  const rA = m3(v.hpe, m3(v.ci, rgb)).map(v.ad);
  const p2 = (2 * rA[0] + rA[1] + 0.05 * rA[2] - 0.305) * v.Nbb;
  const a = rA[0] - (12 * rA[1]) / 11 + rA[2] / 11;
  const b = (rA[0] + rA[1] - 2 * rA[2]) / 9;
  const hd = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  const t = ((50000 / 13) * v.Nc * v.Ncb * Math.sqrt(a * a + b * b)) / (p2 + 0.305);
  const J = 100 * Math.pow(p2 / v.Aw, v.c * v.z);
  return {
    h: hd,
    c: Math.pow(t === 0 ? 0 : Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, v.n), 0.73), 1) * Math.sqrt(J / 100),
    t: Y <= 0 ? 0 : Y >= 1 ? 100 : 116 * Math.cbrt(Y) - 16,
  };
}

export function hexToHct(hex: string): HctColor {
  const [r, g, b] = _h2lr(hex);
  return _x2hct(..._m3(_LX, [r, g, b]));
}

function _jFromTone(tone: number): number {
  const v = _VC;
  const m3 = (m: Mat3, v2: Vec3): Vec3 => [
    m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2],
    m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2],
    m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2],
  ];
  if (tone <= 0) return 0;
  if (tone >= 100) return 100;
  const Y = tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3;
  const cat = m3(v.cat, [Y * 0.95047, Y, Y * 1.08883]).map((c2, i) => c2 * v.Drgb[i]) as Vec3;
  const hR = m3(v.hpe, m3(v.ci, cat)).map(v.ad);
  return 100 * Math.pow(Math.max(0, ((2 * hR[0] + hR[1] + 0.05 * hR[2] - 0.305) * v.Nbb) / v.Aw), v.c * v.z);
}

function _hctRgbOrNull(hue: number, ch: number, J: number): Vec3 | null {
  const v = _VC;
  const m3 = (m: Mat3, v2: Vec3): Vec3 => [
    m[0][0] * v2[0] + m[0][1] * v2[1] + m[0][2] * v2[2],
    m[1][0] * v2[0] + m[1][1] * v2[1] + m[1][2] * v2[2],
    m[2][0] * v2[0] + m[2][1] * v2[1] + m[2][2] * v2[2],
  ];
  if (J <= 0) return null;
  const ta = ch > 0 ? Math.pow(ch / Math.sqrt(J / 100), 1 / 0.9) / Math.pow(1.64 - Math.pow(0.29, v.n), 0.73) : 0;
  const hr = (hue * Math.PI) / 180;
  const p1 = (50000 / 13) * v.Nc * v.Ncb;
  const p2 = (Math.pow(J / 100, 1 / (v.c * v.z)) * v.Aw) / v.Nbb + 0.305;
  let a = 0, b = 0;
  if (ta > 0) {
    const g = (23 * (p2 + 0.305) * ta) / (23 * p1 + 11 * ta * Math.cos(hr) + 108 * ta * Math.sin(hr));
    a = g * Math.cos(hr);
    b = g * Math.sin(hr);
  }
  const iv = (c2: number) => {
    const s = Math.sign(c2);
    return (s * Math.pow(Math.max(0, (Math.abs(c2) * 27.13) / (400 - Math.abs(c2))), 1 / 0.42)) / v.FL;
  };
  const Ra = (460 * p2 + 451 * a + 288 * b) / 1403;
  const Ga = (460 * p2 - 891 * a - 261 * b) / 1403;
  const Ba = (460 * p2 - 220 * a - 6300 * b) / 1403;
  const lr = m3(_XL, m3(v.ci, m3(v.hpi, [Ra, Ga, Ba].map(iv) as Vec3).map((c2, i) => c2 / v.Drgb[i]) as Vec3));
  if (Math.max(lr[0], lr[1], lr[2]) > 1 + 1e-4 || Math.min(lr[0], lr[1], lr[2]) < -1e-4) return null;
  return lr.map((x) => Math.max(0, x)) as Vec3;
}

export function hctToHex(hue: number, ch: number, tone: number): string {
  if (ch < 0.0001 || tone <= 0 || tone >= 100) {
    if (tone <= 0) return "#000000";
    if (tone >= 100) return "#ffffff";
    const v = srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3);
    return "#" + v.toString(16).padStart(2, "0").repeat(3);
  }
  const J = _jFromTone(tone);
  if (J <= 0) return "#000000";
  let lo = 0, hi = ch, best: string | null = null;
  for (let it = 0; it < 50; it++) {
    if (hi - lo < 0.01) break;
    const mid = (lo + hi) / 2;
    const rgb = _hctRgbOrNull(hue, mid, J);
    if (rgb === null) {
      hi = mid;
    } else {
      best = _lr2h(rgb[0], rgb[1], rgb[2]);
      lo = mid;
    }
  }
  return best || "#" + srgbDelinearize(tone > 8 ? Math.pow((tone + 16) / 116, 3) : tone / 903.3).toString(16).padStart(2, "0").repeat(3);
}

// ── CONTRAST SOLVER ───────────────────────────────────────────────────────────

function _relLumFromLinear(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function _wcagContrast(lum1: number, lum2: number): number {
  const hi = Math.max(lum1, lum2), lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

function _lumOfHex(hex: string): number {
  const [r, g, b] = _h2lr(hex);
  return _relLumFromLinear(r, g, b);
}

function _inGamutOklch(L: number, C: number, H: number): boolean {
  if (L <= 0 || L >= 1) return false;
  return hexToOklch(oklchToHex(L, C, H)).C >= C - 0.002;
}

function _maxChromaAtLH(L: number, H: number, startC: number): number {
  if (startC <= 0.001) return 0;
  let lo = 0, hi = startC;
  for (let i = 0; i < 40; i++) {
    if (hi - lo < 0.0005) break;
    const mid = (lo + hi) / 2;
    if (_inGamutOklch(L, mid, H)) lo = mid;
    else hi = mid;
  }
  return lo;
}

function _targetChroma(L: number, srcL: number, srcC: number, _srcH: number, mode: SolverMode): number {
  if (srcC < 0.001) return 0;
  switch (mode) {
    case "saturated": return srcC;
    case "luminance": return srcC * (1 - Math.pow(Math.abs(2 * L - 1), 1.5));
    case "natural": return (srcC / Math.max(srcL, 1 - srcL)) * Math.min(L, 1 - L);
    default: return srcC;
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
      if (++failedConversions > 8) { console.warn("_searchL: too many failed hex conversions, aborting search"); break; }
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
    return { hex: fallback, achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)), solverMode: mode, chromaReduced: true, clipped: true, warning: `Target contrast ${targetContrast} is unreachable against this background (max ${maxTheoreticalContrast.toFixed(2)}). Black/white used.` };
  }

  const lLow = 0.001, lHigh = 0.999;
  let solvedL: number | null = null, solvedC: number | null = null, chromaReduced = false;

  if (mode === "chroma-maximized") {
    const getHex = (L: number) => {
      const maxC = _maxChromaAtLH(L, src.H, Math.max(src.C, 0.2));
      return oklchToHex(L, maxC < 0.001 ? 0 : maxC, src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) solvedC = _maxChromaAtLH(solvedL, src.H, Math.max(src.C, 0.2));
  } else if (mode === "hue-locked") {
    const getHex = (L: number) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, "natural");
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, "natural");
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (solvedC < src.C - 0.01) chromaReduced = true;
    }
  } else {
    const getHex = (L: number) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, mode);
      return oklchToHex(L, _maxChromaAtLH(L, src.H, rawC), src.H);
    };
    solvedL = _searchL(bgLum, targetContrast, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, mode);
      solvedC = _maxChromaAtLH(solvedL, src.H, rawC);
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
    }
  }

  if (solvedL === null) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return { hex: fallback, achievedContrast: parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2)), solverMode: mode, chromaReduced: true, clipped: true, warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.` };
  }

  const resultHex = oklchToHex(solvedL, solvedC || 0, src.H);
  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));
  let warning: string | null = null;
  if (achievedContrast < targetContrast) warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
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
