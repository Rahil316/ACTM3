const BLANK_PRESETS = [
  {
    id: "blank-slate",
    name: "Blank Slate",
    badge: "Blank",
    description:
      "The fastest start. Two colors, three roles, five named variations. Swap the seed colors and you have a working system in under a minute.",
    tags: ["starter", "minimal", "blank", "simple", "beginner"],
    swatches: ["3B82F6", "94A3B8"],
    config: {
      name: "My Design System",
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
      resolveTokensDirectly: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      tokenGrouping: "color",
      includeColorScalesCollection: true,
      includeDescriptions: false,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",

      scaleStepNames: null,

      // 5 named variations covering the full perceptual range.
      // These names work for any role — background, border, text, or fill.
      variations: [
        { name: "Subtle", shorthand: "1" },
        { name: "Soft", shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong", shorthand: "4" },
        { name: "Bold", shorthand: "5" },
      ],

      colors: [],

      roles: [],

      themes: [],
    },
  },
];
