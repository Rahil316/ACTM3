// Generates a wide-ranging matrix of EngineInput configs for stress-testing
// variableMaker() in src/shared/engine/clrEngine.ts. Pure config generation —
// no engine calls happen here (see run-stress-test.ts).
//
// Seed coverage is built from named, composable groups (see SEED_GROUPS
// below) rather than one flat loop, so each generated case carries *why* its
// seed exists (systematic grid vs. a targeted problem cluster) — this lets
// analyze-results.ts and build-report.ts break anomalies down by coverage
// intent instead of just by raw hex value.

import type { Color, Theme, Role, Variation, ScaleAlgorithm, SolverMode } from "../../src/shared/types";
import type { EngineInput } from "../../src/shared/engine/clrEngine";

export type SeedGroup = "grid" | "warm-hue-cluster" | "low-chroma-cluster" | "edge-case";

export interface GeneratedCase {
  caseId: string;
  pluginMode: "scale" | "direct";
  seedHex: string;
  seedLabel: string;
  seedGroup: SeedGroup;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
  scaleLength?: number;
  contrastTargets: number[];
  config: EngineInput;
}

const SCALE_ALGORITHMS: ScaleAlgorithm[] = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear", "Fidelity"];
const SOLVER_MODES: SolverMode[] = ["natural", "constant-chroma", "symmetric", "max-chroma", "gamut-cusp", "apca-natural"];
const SCALE_LENGTHS = [5, 9, 12];
const CONTRAST_TARGET_SETS: number[][] = [
  [1.5, 3, 4.5, 7, 12],
  [3, 4.5],
  [4.5],
  [7, 12],
];

// ── Seed color generation ────────────────────────────────────────────────────

function hslToHexLocal(h: number, s: number, l: number): string {
  // local, dependency-free HSL->hex so config generation never depends on the
  // engine under test
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

interface SeedSpec {
  hex: string;
  label: string;
  group: SeedGroup;
}

interface SeedGroupSpec {
  group: SeedGroup;
  generate: () => SeedSpec[];
}

// Systematic hue/sat/light grid — the broad, unbiased coverage sweep.
// 24 hues (15° steps) x 5 saturations x 7 lightness levels = 840 seeds.
function generateSystematicGrid(): SeedSpec[] {
  const seeds: SeedSpec[] = [];
  const HUE_STEPS = 24; // every 15deg
  const SAT_LEVELS = [10, 30, 50, 70, 90];
  const LIGHT_LEVELS = [10, 25, 40, 50, 60, 75, 90];

  for (let hi = 0; hi < HUE_STEPS; hi++) {
    const h = (360 / HUE_STEPS) * hi;
    for (const s of SAT_LEVELS) {
      for (const l of LIGHT_LEVELS) {
        seeds.push({ hex: hslToHexLocal(h, s, l), label: `h${Math.round(h)}_s${s}_l${l}`, group: "grid" });
      }
    }
  }
  return seeds;
}

// Warm-hue cluster — dense sampling of yellow/lime/warm-green (45-90°), the
// hue range documented in color-system-guidelines.md as showing HSL-lightness
// collapse in the four HSL-search-based scale algorithms (Natural, Uniform,
// Expressive, Symmetric): a yellow seed's HSL lightness crashes far faster
// than a blue seed's at the same step index, because the WCAG relative-
// luminance formula those algorithms search against weights green/red far
// more than blue. Fine 5° hue steps across the exact problem range, crossed
// with high saturation (worst case, per the same doc) and every lightness
// band, to give that specific failure mode real statistical weight instead
// of the ~2 grid points/hue it'd otherwise get.
function generateWarmHueCluster(): SeedSpec[] {
  const seeds: SeedSpec[] = [];
  const HUES = [45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
  const SAT_LEVELS = [60, 80, 100];
  const LIGHT_LEVELS = [15, 30, 45, 60, 75, 90];

  for (const h of HUES) {
    for (const s of SAT_LEVELS) {
      for (const l of LIGHT_LEVELS) {
        seeds.push({ hex: hslToHexLocal(h, s, l), label: `warm_h${h}_s${s}_l${l}`, group: "warm-hue-cluster" });
      }
    }
  }
  return seeds;
}

// Low-chroma cluster — seeds with deliberately muted/near-neutral chroma at
// every hue, dense enough to exercise gamut-cusp's and apca-natural's
// seed-fraction math (srcC / maxChromaAtLH(srcL, srcH)) at fraction values
// close to 0, where a implementation bug would most likely round to a
// degenerate case (fraction 0 or NaN) rather than showing up as a subtly
// wrong color the way it might at high chroma.
function generateLowChromaCluster(): SeedSpec[] {
  const seeds: SeedSpec[] = [];
  const HUE_STEPS = 12; // every 30deg — hue matters less here than chroma level
  const SAT_LEVELS = [3, 6, 10, 15, 20];
  const LIGHT_LEVELS = [20, 35, 50, 65, 80];

  for (let hi = 0; hi < HUE_STEPS; hi++) {
    const h = (360 / HUE_STEPS) * hi;
    for (const s of SAT_LEVELS) {
      for (const l of LIGHT_LEVELS) {
        seeds.push({ hex: hslToHexLocal(h, s, l), label: `lowc_h${Math.round(h)}_s${s}_l${l}`, group: "low-chroma-cluster" });
      }
    }
  }
  return seeds;
}

// Hand-picked edge cases: pure grayscale, near-black/white, primaries/
// secondaries, and known high-chroma extremes.
function generateEdgeCases(): SeedSpec[] {
  const cases: [string, string][] = [
    ["#000000", "pure_black"],
    ["#FFFFFF", "pure_white"],
    ["#808080", "mid_gray"],
    ["#010101", "near_black"],
    ["#FEFEFE", "near_white"],
    ["#FF0000", "primary_red"],
    ["#00FF00", "primary_green"],
    ["#0000FF", "primary_blue"],
    ["#FFFF00", "primary_yellow"],
    ["#00FFFF", "primary_cyan"],
    ["#FF00FF", "primary_magenta"],
    ["#F2F2F2", "very_light_gray"],
    ["#0D0D0D", "very_dark_gray"],
    ["#7FFF00", "chartreuse_high_chroma"],
    ["#FF4500", "orange_red_high_chroma"],
    ["#8A2BE2", "blue_violet_high_chroma"],
  ];
  return cases.map(([hex, label]) => ({ hex, label, group: "edge-case" as const }));
}

const SEED_GROUPS: SeedGroupSpec[] = [
  { group: "grid", generate: generateSystematicGrid },
  { group: "warm-hue-cluster", generate: generateWarmHueCluster },
  { group: "low-chroma-cluster", generate: generateLowChromaCluster },
  { group: "edge-case", generate: generateEdgeCases },
];

function generateSeedColors(): SeedSpec[] {
  return SEED_GROUPS.flatMap((g) => g.generate());
}

// ── Fixed rig: themes/colors/roles/variations wrapper per case ──────────────

function makeThemes(): Theme[] {
  return [
    { name: "Light", bg: "#FFFFFF" },
    { name: "Dark", bg: "#121212" },
  ];
}

function makeColor(seed: SeedSpec, scaleAlgorithm?: ScaleAlgorithm, solverMode?: SolverMode): Color {
  return {
    _id: `color-${seed.label}`,
    name: seed.label,
    shorthand: seed.label.slice(0, 8),
    value: seed.hex,
    scaleAlgorithm,
    solverMode,
  };
}

function makeVariations(targets: number[]): Variation[] {
  return targets.map((t, i) => ({ name: `v${i + 1}`, shorthand: `v${i + 1}`, target: t }));
}

function makeRoles(variations: Variation[]): Role[] {
  return [
    { name: "on-surface", shorthand: "on-srf", variations, description: "Primary content role" },
    { name: "border", shorthand: "brd", variations, description: "Border/divider role" },
  ];
}

// ── Case assembly ─────────────────────────────────────────────────────────────

export function generateAllCases(): GeneratedCase[] {
  const cases: GeneratedCase[] = [];
  const seeds = generateSeedColors();
  const themes = makeThemes();

  // Scale mode: cross seeds x algorithm x scaleLength, contrast targets fixed
  // to the richest set (drives role/variation mapping quality checks).
  let scaleCount = 0;
  for (const seed of seeds) {
    for (const algo of SCALE_ALGORITHMS) {
      const scaleLength = SCALE_LENGTHS[scaleCount % SCALE_LENGTHS.length];
      const targets = CONTRAST_TARGET_SETS[0];
      const variations = makeVariations(targets);
      const roles = makeRoles(variations);
      const color = makeColor(seed, algo, undefined);
      const config: EngineInput = {
        colors: [color],
        themes,
        roles,
        variations,
        scaleLength,
        scaleAlgorithm: algo,
        pluginMode: "scale",
        useUniformAlgorithm: true,
      };
      cases.push({
        caseId: `scale_${seed.label}_${algo}_len${scaleLength}`,
        pluginMode: "scale",
        seedHex: seed.hex,
        seedLabel: seed.label,
        seedGroup: seed.group,
        scaleAlgorithm: algo,
        scaleLength,
        contrastTargets: targets,
        config,
      });
      scaleCount++;
    }
  }

  // Direct mode: cross seeds x solverMode x contrast-target-set
  for (const seed of seeds) {
    for (const solverMode of SOLVER_MODES) {
      for (const targets of CONTRAST_TARGET_SETS) {
        const variations = makeVariations(targets);
        const roles = makeRoles(variations);
        const color = makeColor(seed, undefined, solverMode);
        const config: EngineInput = {
          colors: [color],
          themes,
          roles,
          variations,
          scaleLength: 9,
          scaleAlgorithm: "Natural",
          pluginMode: "direct",
          useUniformAlgorithm: true,
          solverMode,
        };
        cases.push({
          caseId: `direct_${seed.label}_${solverMode}_targets${targets.join("-")}`,
          pluginMode: "direct",
          seedHex: seed.hex,
          seedLabel: seed.label,
          seedGroup: seed.group,
          solverMode,
          contrastTargets: targets,
          config,
        });
      }
    }
  }

  return cases;
}

if (require.main === module) {
  const cases = generateAllCases();
  const byGroup = new Map<SeedGroup, number>();
  for (const c of cases) byGroup.set(c.seedGroup, (byGroup.get(c.seedGroup) ?? 0) + 1);
  console.log(`Generated ${cases.length} cases.`);
  for (const [group, count] of byGroup) console.log(`  ${group}: ${count}`);
}
