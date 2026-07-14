// Generates a wide-ranging matrix of EngineInput configs for stress-testing
// variableMaker() in src/shared/engine/clrEngine.ts. Pure config generation —
// no engine calls happen here (see run-stress-test.ts).

import type { Color, Theme, Role, Variation, ScaleAlgorithm, SolverMode, EngineInput } from "../../src/shared/types";

export interface GeneratedCase {
  caseId: string;
  pluginMode: "scale" | "direct";
  seedHex: string;
  seedLabel: string;
  scaleAlgorithm?: ScaleAlgorithm;
  solverMode?: SolverMode;
  scaleLength?: number;
  contrastTargets: number[];
  config: EngineInput;
}

const SCALE_ALGORITHMS: ScaleAlgorithm[] = ["Natural", "Uniform", "Expressive", "Symmetric", "OKLCH", "Material", "Linear", "Fidelity"];
const SOLVER_MODES: SolverMode[] = ["natural", "constant-chroma", "symmetric", "hue-locked", "max-chroma"];
const SCALE_LENGTHS = [5, 9, 12];
const CONTRAST_TARGET_SETS: number[][] = [
  [1.5, 3, 4.5, 7, 12],
  [3, 4.5],
  [4.5],
  [7, 12],
];

// ── Seed color generation ────────────────────────────────────────────────────
// Hue wheel at fine steps x a spread of saturation/lightness combos, plus
// explicit edge cases (pure grayscale, near-black, near-white, primaries,
// max-chroma extremes).

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
}

function generateSeedColors(): SeedSpec[] {
  const seeds: SeedSpec[] = [];

  const HUE_STEPS = 12; // every 30deg
  const SAT_LEVELS = [15, 50, 90];
  const LIGHT_LEVELS = [10, 30, 50, 70, 90];

  for (let hi = 0; hi < HUE_STEPS; hi++) {
    const h = (360 / HUE_STEPS) * hi;
    for (const s of SAT_LEVELS) {
      for (const l of LIGHT_LEVELS) {
        seeds.push({ hex: hslToHexLocal(h, s, l), label: `h${Math.round(h)}_s${s}_l${l}` });
      }
    }
  }

  // Explicit edge cases
  const edgeCases: SeedSpec[] = [
    { hex: "#000000", label: "pure_black" },
    { hex: "#FFFFFF", label: "pure_white" },
    { hex: "#808080", label: "mid_gray" },
    { hex: "#010101", label: "near_black" },
    { hex: "#FEFEFE", label: "near_white" },
    { hex: "#FF0000", label: "primary_red" },
    { hex: "#00FF00", label: "primary_green" },
    { hex: "#0000FF", label: "primary_blue" },
    { hex: "#FFFF00", label: "primary_yellow" },
    { hex: "#00FFFF", label: "primary_cyan" },
    { hex: "#FF00FF", label: "primary_magenta" },
    { hex: "#F2F2F2", label: "very_light_gray" },
    { hex: "#0D0D0D", label: "very_dark_gray" },
    { hex: "#7FFF00", label: "chartreuse_high_chroma" },
    { hex: "#FF4500", label: "orange_red_high_chroma" },
    { hex: "#8A2BE2", label: "blue_violet_high_chroma" },
  ];
  seeds.push(...edgeCases);

  return seeds;
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
  console.log(`Generated ${cases.length} cases.`);
}
