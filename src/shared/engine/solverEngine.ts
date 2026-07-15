// Direct-mode contrast solver — extracted out of clrEngine.ts so solver-mode
// code and scale-algorithm code (which stays in clrEngine.ts) can be
// researched and maintained independently. Nothing here depends on anything
// scale-algorithm-specific; the only cross-boundary caller is
// _solveDirectMode in clrEngine.ts, which imports solveColorForContrast from
// here instead of defining it in-file.
//
// _relLumFromLinear/_wcagContrast/_lumOfHex are a second, private luminance
// implementation kept deliberately separate from colorMath's relLum —
// benchmarked directly: colorMath's culori-backed relLum is ~7x slower per
// call (general-purpose parse/mode-conversion overhead vs. this tight inline
// calculation), and _searchL below calls this on every one of its up to 60
// bisection iterations, for every color/role/variation/theme combination in
// a full variableMaker() run. Not migrated; kept as a documented,
// performance-motivated exception rather than a leftover oversight.

import { hexToOklch, oklchToHex, maxChromaAtLH, normalizeHex, apcaContrast } from "../colorMath";
import { srgbLinearize } from "./clrUtils";

import type { SolverMode } from "../types";

export type { SolverMode };

// ── SOLVER CONSTANTS ──────────────────────────────────────────────────────────

const SOLVER_MODES: SolverMode[] = ["natural", "constant-chroma", "symmetric", "max-chroma", "gamut-cusp", "apca-natural"];
const OVERSHOOT_WARN = 0.3;
const MAX_ITER = 60;
const L_EPS = 1e-5;

// APCA Lc targets, translated from this codebase's WCAG-ratio variation
// targets at their five conventional anchor points (1.5/3/4.5/7/12). Radix
// Colors' published Lc thresholds (30/45/60/75/90) were tried first as an
// industry reference, but empirically produced Lc targets far too low for
// this specific gamut-relative chroma model — e.g. searching for "Lc 60"
// (assumed ≈ WCAG 4.5) actually stopped at a lightness achieving only WCAG
// ~3.3, a systematic ~1.2-3.0 ratio shortfall that grew worse at higher
// targets. These anchors are instead fit directly against this codebase's
// own gamut-relative chroma curve: for 6 representative hues (vivid blue,
// red, green, yellow, purple, and near-neutral gray), swept lightness to
// find the L that actually reaches each WCAG target against white, then
// measured the real Lc at that L. Variance across hues was small (e.g.
// target 12 → Lc 96.0-97.7 across all 6), confirming a stable,
// near-hue-independent correspondence for this model. Only used by
// apca-natural's search — WCAG targets are otherwise stored/authored
// unchanged. Interpolated linearly between anchors for in-between values.
const WCAG_TO_LC_ANCHORS: [number, number][] = [
  [1.5, 23.3],
  [3, 56.4],
  [4.5, 70.7],
  [7, 83.6],
  [12, 96.8],
];

function _wcagTargetToLc(target: number): number {
  const anchors = WCAG_TO_LC_ANCHORS;
  if (target <= anchors[0][0]) return anchors[0][1];
  if (target >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [w0, lc0] = anchors[i];
    const [w1, lc1] = anchors[i + 1];
    if (target >= w0 && target <= w1) {
      const t = (target - w0) / (w1 - w0);
      return lc0 + t * (lc1 - lc0);
    }
  }
  return anchors[anchors.length - 1][1];
}

// ── COLOR SPACES ──────────────────────────────────────────────────────────────

type Vec3 = [number, number, number];

function _h2lr(hex: string): Vec3 {
  const n = parseInt((normalizeHex(hex) || "#000000").replace("#", ""), 16);
  return [srgbLinearize((n >> 16) & 255), srgbLinearize((n >> 8) & 255), srgbLinearize(n & 255)];
}

// ── CONTRAST SOLVER ───────────────────────────────────────────────────────────

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

// Gamut-relative chroma fraction: how vivid the seed is relative to what's
// physically achievable at its own hue+lightness. Shared by gamut-cusp and
// apca-natural (they differ only in which contrast metric drives the
// lightness search below) — same formula already proven in clrEngine.ts's
// Fidelity scale algorithm, applied here inside the solver's bisection
// instead of a fixed scale-step series.
function _gamutRelativeChroma(L: number, srcL: number, srcC: number, srcH: number): number {
  if (srcC < 0.001) return 0;
  const envelope = maxChromaAtLH(srcL, srcH);
  const fraction = envelope > 0.001 ? Math.min(1, srcC / envelope) : 0;
  return fraction * maxChromaAtLH(L, srcH);
}

function _targetChroma(L: number, srcL: number, srcC: number, srcH: number, mode: SolverMode): number {
  if (srcC < 0.001) return 0;
  switch (mode) {
    case "constant-chroma":
      return srcC;
    case "symmetric":
      return srcC * (1 - Math.pow(Math.abs(2 * L - 1), 1.5));
    case "natural":
      return (srcC / Math.max(srcL, 1 - srcL)) * Math.min(L, 1 - L);
    case "gamut-cusp":
    case "apca-natural":
      return _gamutRelativeChroma(L, srcL, srcC, srcH);
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

// Same bisection shape as _searchL, but drives on APCA's signed Lc instead of
// WCAG contrast. APCA is polarity-aware (light-on-dark and dark-on-light use
// different exponent pairs internally — see apca-vendor.ts) rather than a
// symmetric ratio, so the comparison is against |Lc| >= |targetLc| with the
// sign implied by which side of the background the candidate lightness sits
// on — same direction logic _searchL already uses via bgLum > 0.5.
function _searchLApca(bgHex: string, targetLc: number, lo: number, hi: number, getHexAtL: (L: number) => string | null): number | null {
  const bgLum = _lumOfHex(bgHex);
  let bestL: number | null = null;
  let failedConversions = 0;
  for (let i = 0; i < MAX_ITER; i++) {
    if (hi - lo < L_EPS) break;
    const mid = (lo + hi) / 2;
    const hex = getHexAtL(mid);
    if (!hex) {
      if (++failedConversions > 8) {
        console.warn("_searchLApca: too many failed hex conversions, aborting search");
        break;
      }
      lo = mid;
      continue;
    }
    const lc = Math.abs(apcaContrast(hex, bgHex));
    if (lc >= targetLc) {
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
  metric: "wcag" | "apca";
  solverMode: SolverMode;
  chromaReduced: boolean;
  clipped: boolean;
  warning: string | null;
}

export function solveColorForContrast(sourceHex: string, targetContrast: number, bgHex: string, solverMode: SolverMode | string): SolverResult {
  const mode: SolverMode = SOLVER_MODES.includes(solverMode as SolverMode) ? (solverMode as SolverMode) : "natural";
  const metric: "wcag" | "apca" = mode === "apca-natural" ? "apca" : "wcag";
  const src = hexToOklch(sourceHex);
  const bgLum = _lumOfHex(bgHex);
  const bgIsLight = bgLum > 0.18;

  const maxTheoreticalContrast = _wcagContrast(bgLum, bgIsLight ? 0 : 1);
  if (metric === "wcag" && targetContrast > maxTheoreticalContrast + 0.01) {
    const fallback = bgIsLight ? "#000000" : "#FFFFFF";
    return {
      hex: fallback,
      achievedContrast: parseFloat(maxTheoreticalContrast.toFixed(2)),
      metric,
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
  } else if (mode === "apca-natural") {
    const targetLc = _wcagTargetToLc(targetContrast);
    const getHex = (L: number) => {
      const rawC = _targetChroma(L, src.L, src.C, src.H, mode);
      return oklchToHex(L, Math.min(rawC, maxChromaAtLH(L, src.H)), src.H);
    };
    solvedL = _searchLApca(bgHex, targetLc, lLow, lHigh, getHex);
    if (solvedL !== null) {
      const rawC = _targetChroma(solvedL, src.L, src.C, src.H, mode);
      solvedC = Math.min(rawC, maxChromaAtLH(solvedL, src.H));
      if (rawC > 0.001 && solvedC < rawC - 0.01) chromaReduced = true;
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
    const fallbackAchieved = metric === "apca" ? parseFloat(apcaContrast(fallback, bgHex).toFixed(2)) : parseFloat(_wcagContrast(_lumOfHex(fallback), bgLum).toFixed(2));
    return {
      hex: fallback,
      achievedContrast: fallbackAchieved,
      metric,
      solverMode: mode,
      chromaReduced: true,
      clipped: true,
      warning: `Solver could not find a solution for target contrast ${targetContrast}. Black/white used.`,
    };
  }

  const resultHex = oklchToHex(solvedL, solvedC || 0, src.H);

  if (metric === "apca") {
    const targetLc = _wcagTargetToLc(targetContrast);
    const achievedLc = parseFloat(apcaContrast(resultHex, bgHex).toFixed(2));
    let warning: string | null = null;
    if (Math.abs(achievedLc) < targetLc - 0.5) warning = `Achieved Lc ${achievedLc} is below target Lc ${targetLc.toFixed(0)}. Possible floating-point edge case.`;
    return { hex: resultHex, achievedContrast: achievedLc, metric, solverMode: mode, chromaReduced, clipped: false, warning };
  }

  const achievedContrast = parseFloat(_wcagContrast(_lumOfHex(resultHex), bgLum).toFixed(2));
  // achievedContrast is rounded to 2dp above; round targetContrast the same way
  // before comparing so rounding alone can't produce a spurious shortfall warning.
  const roundedTarget = parseFloat(targetContrast.toFixed(2));
  let warning: string | null = null;
  if (achievedContrast < roundedTarget) warning = `Achieved contrast ${achievedContrast} is below target ${targetContrast}. Possible floating-point edge case.`;
  else if (achievedContrast > targetContrast + OVERSHOOT_WARN) warning = `Target ${targetContrast} not achievable precisely; nearest is ${achievedContrast} (overshoot ${(achievedContrast - targetContrast).toFixed(2)}).`;

  return { hex: resultHex, achievedContrast, metric, solverMode: mode, chromaReduced, clipped: false, warning };
}
