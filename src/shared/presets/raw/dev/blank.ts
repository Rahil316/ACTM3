import type { Preset } from "../../themeShop";

const presets: Preset[] = [
  {
    id: "blank-slate",
    name: "Blank Slate",
    badge: "Blank",
    description: "The fastest start. Two colors, three roles, five named variations. Swap the seed colors and you have a working system in under a minute.",
    tags: ["starter", "minimal", "blank", "simple", "beginner"],
    swatches: ["3B82F6", "94A3B8"],
    config: {
      name: "Token Wand Design System",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      alphaValues: [5, 10, 20, 25, 50, 75, 80, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",

      scaleSteps: null,

      // 5 named variations covering the full perceptual range.
      // These names work for any role — background, border, text, or fill.
      variations: [
        { name: "Subtle", shorthand: "1", target: 1.5 },
        { name: "Soft", shorthand: "2", target: 3.0 },
        { name: "Default", shorthand: "3", target: 4.5 },
        { name: "Strong", shorthand: "4", target: 7.0 },
        { name: "Bold", shorthand: "5", target: 12.0 },
      ],

      colors: [],

      roles: [],

      themes: [],
    },
  },
];

export default presets;
