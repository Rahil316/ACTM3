#!/usr/bin/env tsx
/**
 * test-localbg.ts
 *
 * Manually verifies the localBg dynamic (per-color) fix.
 *
 * Setup:
 *   2 colors: Blue (#1D4ED8), Red (#DC2626)
 *   2 themes: Light (#FFFFFF), Dark (#0F172A)
 *   2 roles, each with 1 variation, same contrast target (4.5):
 *     Role-1 "fill"    — no localBg (contrasts vs theme.bg)
 *     Role-2 "on-fill" — localBg dynamic: [color]-fill-0
 *                        (i.e. bg = the fill token of the same color)
 *
 * Expected: Role-2 picks a different scale step than Role-1 because it
 * contrasts against the fill token hex, not the page bg.
 */

import { variableMaker } from "../src/shared/clrEngine.js";
import { resolveTokenRefBgs } from "../src/plugin/config.js";
import type { ProjectStore } from "../src/ui/types/state.js";

// ── Config ────────────────────────────────────────────────────────────────────

const BRAND_HEX = "#5B6AF0"; // same value for both colors

const config: ProjectStore = {
  name: "localbg-test",
  pluginMode: "scale",
  scaleAlgorithm: "Natural",
  scaleLength: 11,
  useUniformAlgorithm: true,
  algorithmScopeLevel: "color",
  solverMode: "natural",
  tokenNameSegments: ["color", "role", "variation"],
  useShorthandColors: false,
  useShorthandRoles: false,
  useShorthandVariations: false,
  useShorthandSteps: false,
  includeSourceColors: false,
  includeColorScalesCollection: true,
  includeDescriptions: false,
  scaleCollectionName: "_scale",
  tokenCollectionName: "color tokens",
  scaleSteps: null,

  colors: [
    { _id: "c-brand1", name: "brand-1", shorthand: "b1", value: BRAND_HEX },
    { _id: "c-brand2", name: "brand-2", shorthand: "b2", value: BRAND_HEX },
  ],

  themes: [
    { name: "Light", bg: "#FFFFFF" },
    { name: "Dark", bg: "#0F172A" },
  ],

  variations: [{ name: "base", shorthand: "b", target: 5 }],

  roles: [
    {
      name: "fill",
      shorthand: "fi",
      mappingMethod: "contrast",
      variations: null,
      // no localBg — contrasts vs theme.bg
    },
    {
      name: "TextOnFill",
      shorthand: "tof",
      mappingMethod: "contrast",
      variations: null,
      // Dynamic local bg: use the fill token of the same color as background.
      localBg: null,
      localBgDynamicRef: "[color]/fill/base",
    },
  ],
} as unknown as ProjectStore;

// ── Two-pass engine run (mirrors index.ts runEngine + resolveTokenRefBgs) ─────

const pass1 = variableMaker(config);
const resolved = resolveTokenRefBgs(config, pass1);
const result = resolved ? variableMaker(config) : pass1;

// ── Helpers ───────────────────────────────────────────────────────────────────

const W = { theme: 8, color: 8, role: 10, bg: 12, target: 9, source: 12, hex: 10, ratio: 10, step: 10, adj: 6 };
const cell = (s: string, w: number) => String(s).padEnd(w);
const row = (...cols: [string, number][]) => cols.map(([s, w]) => cell(s, w)).join("│");
const hr = (widths: number[]) => widths.map((w) => "─".repeat(w)).join("┼");

// ── INPUT TABLE ───────────────────────────────────────────────────────────────

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║               INPUT CONFIGURATION                           ║");
console.log("╚══════════════════════════════════════════════════════════════╝");

// Colors
console.log("\n  Colors");
console.log("  " + hr([8, 10, 10]));
console.log("  " + row(["Name", 8], ["Hex", 10], ["ID", 10]));
console.log("  " + hr([8, 10, 10]));
for (const c of config.colors) {
  console.log("  " + row([c.name, 8], ["#" + c.value.replace("#", "").toUpperCase(), 10], [c._id!, 10]));
}

// Themes
console.log("\n  Themes");
console.log("  " + hr([10, 12]));
console.log("  " + row(["Name", 10], ["Background", 12]));
console.log("  " + hr([10, 12]));
for (const t of config.themes) {
  console.log("  " + row([t.name, 10], ["#" + t.bg.replace("#", "").toUpperCase(), 12]));
}

// Roles
console.log("\n  Roles");
console.log("  " + hr([10, 9, 10, 32]));
console.log("  " + row(["Name", 10], ["Target", 9], ["Var", 10], ["Local BG", 32]));
console.log("  " + hr([10, 9, 10, 32]));
for (const r of config.roles) {
  const targets = (r.variations ?? config.variations ?? []).map((v) => v.target).join(", ");
  const vars = (config.variations ?? []).map((v) => v.name).join(", ");
  const lbg = r.localBgDynamicRef ? `dynamic: "${r.localBgDynamicRef}"` : r.localBg ? JSON.stringify(r.localBg) : "none (theme bg)";
  console.log("  " + row([r.name, 10], [targets, 9], [vars, 10], [lbg, 32]));
}

// ── TWO-PASS SUMMARY ──────────────────────────────────────────────────────────

console.log("\n  Engine passes");
console.log(`  Pass 1: run with localBgDynamicRef — produces fill tokens`);
console.log(`  resolveTokenRefBgs: replaced [color] → per-color bg map`);
if (config.roles[1].localBgPerColor) {
  for (const [colorName, themeMap] of Object.entries(config.roles[1].localBgPerColor!)) {
    for (const [themeName, hex] of Object.entries(themeMap)) {
      console.log(`    on-fill bg for ${colorName} / ${themeName}: #${hex.replace("#", "").toUpperCase()}`);
    }
  }
}
console.log(`  Pass 2: run with resolved localBgPerColor`);

if (result.errors.warnings.length > 0) {
  console.log("\n  ⚠  Warnings (closest step used):");
  for (const w of result.errors.warnings) console.log(`     ${w.theme} / ${w.color} / ${w.role}: ${w.warning}`);
}

// ── OUTPUT TABLE ──────────────────────────────────────────────────────────────

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║               OUTPUT TOKENS                                  ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

console.log("  " + row(["Theme", W.theme], ["Color", W.color], ["Role", W.role], ["BG used", W.bg], ["Target", W.target], ["Step", W.step], ["Hex", W.hex], ["Contrast", W.ratio], ["Adj", W.adj]));
console.log("  " + hr([W.theme, W.color, W.role, W.bg, W.target, W.step, W.hex, W.ratio, W.adj]));

let lastTheme = "";
for (const [themeName, colorMap] of Object.entries(result.tokens)) {
  const theme = config.themes.find((t) => t.name.toLowerCase() === themeName)!;
  if (lastTheme && lastTheme !== themeName) console.log("  " + hr([W.theme, W.color, W.role, W.bg, W.target, W.step, W.hex, W.ratio, W.adj]));
  lastTheme = themeName;

  for (const [colorName, roleMap] of Object.entries(colorMap)) {
    for (const [roleIdxStr, varMap] of Object.entries(roleMap)) {
      const roleIdx = parseInt(roleIdxStr, 10);
      const role = config.roles[roleIdx];

      let bgHex = theme.bg;
      let bgSrc = "theme";
      if (role.localBgPerColor?.[colorName]?.[themeName]) {
        bgHex = role.localBgPerColor[colorName][themeName];
        bgSrc = "per-color";
      } else if (role.localBg?.kind === "hex" && typeof role.localBg.value === "object" && role.localBg.value?.[themeName]) {
        bgHex = role.localBg.value[themeName];
        bgSrc = "localBg";
      }

      for (const [, token] of Object.entries(varMap)) {
        const vars = role.variations ?? config.variations ?? [];
        const target = vars[parseInt(token.variation)]?.target ?? 4.5;
        const ratio = token.contrast?.ratio?.toFixed(2) ?? "—";
        const adjusted = token.isAdjusted ? "↺" : "✓";
        console.log(
          "  " +
            row(
              [themeName, W.theme],
              [colorName, W.color],
              [role.name, W.role],
              [`#${bgHex.replace("#", "").toUpperCase()} (${bgSrc})`, W.bg],
              [`${target}:1`, W.target],
              [token.tokenRef ?? "direct", W.step],
              [`#${token.value.replace("#", "").toUpperCase()}`, W.hex],
              [`${ratio}:1`, W.ratio],
              [adjusted, W.adj],
            ),
        );
      }
    }
  }
}
console.log("  " + hr([W.theme, W.color, W.role, W.bg, W.target, W.step, W.hex, W.ratio, W.adj]));
console.log();
