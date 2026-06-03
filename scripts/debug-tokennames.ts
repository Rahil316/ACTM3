#!/usr/bin/env tsx
import { variableMaker } from "../src/shared/clrEngine.js";
import { resolveTokenRefBgs } from "../src/plugin/config.js";
import type { ProjectStore } from "../src/ui/types/state.js";

const config: ProjectStore = {
  name: "debug",
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
  alphaValues: [],
  includeColorScalesCollection: true,
  includeDescriptions: false,
  scaleCollectionName: "_scale",
  tokenCollectionName: "color tokens",
  scaleSteps: null,
  colors: [
    { _id: "c-brand1", name: "brand-1", shorthand: "b1", value: "#5B6AF0" },
    { _id: "c-brand2", name: "brand-2", shorthand: "b2", value: "#5B6AF0" },
  ],
  themes: [
    { name: "Light", bg: "#FFFFFF" },
    { name: "Dark", bg: "#0F172A" },
  ],
  variations: [{ name: "base", shorthand: "b", target: 5 }],
  roles: [
    { name: "fill", shorthand: "fi", mappingMethod: "contrast", variations: null },
    { name: "TextOnFill", shorthand: "tof", mappingMethod: "contrast", variations: null, localBg: null, localBgDynamicRef: "[color]-fill-0" },
  ],
  description: "",
  versions: [],
  sourceCollectionName: "",
  canEditRoleVariants: false,
};

console.log("\n── Pass 1 token names (fill role) ──");
const pass1 = variableMaker(config);
for (const [theme, colorMap] of Object.entries(pass1.tokens)) {
  for (const [color, roleMap] of Object.entries(colorMap)) {
    for (const [ri, varMap] of Object.entries(roleMap)) {
      for (const [vi, token] of Object.entries(varMap)) {
        console.log(`  [${theme}] ${color} role[${ri}] var[${vi}] → tokenName: "${token.tokenName}"  value: ${token.value}`);
      }
    }
  }
}

console.log('\n── resolveTokenRefBgs — template "[color]-fill-0" ──');
console.log(
  "  Replacing [color] with color names:",
  config.colors.map((c) => c.name),
);
console.log(
  "  Refs to look up:",
  config.colors.map((c) => `"${c.name}-fill-0"`),
);

const resolved = resolveTokenRefBgs(config, pass1);
console.log("  resolved:", resolved);
console.log("  TextOnFill.localBgPerColor:", JSON.stringify(config.roles[1].localBgPerColor, null, 2));
