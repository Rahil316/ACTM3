/**
 * Blank Slate preset.
 * Scale mode, Natural algorithm, scaleLength=25.
 * variationTargets = WCAG contrast ratios (1.0–21.0).
 *
 * Minimal starting point: 2 colors, 3 roles, 5 named variations.
 * Designed to be the fastest possible start — swap the seed colors and go.
 * No per-role overrides, no alpha tints, no source colors.
 * Every concept is introduced once and kept simple.
 *
 * Each variation maps to a contrast target so the engine walks the scale
 * for the closest matching step:
 *   Subtle  → 1.0:1 (lightest tint)
 *   Soft    → 1.1:1 (subtle surface)
 *   Default → 1.3:1 (light fill)
 *   Strong  → 1.6:1 (border)
 *   Bold    → 2.0:1 (visible accent)
 *
 * Text role uses contrast targets matching readability tiers:
 *   3.0:1 (AA large), 4.5:1 (AA body), 7.0:1 (AAA), 10:1, 14:1
 */

const BLANK_PRESETS = [
  {
    id: "blank-slate",
    name: "Blank Slate",
    badge: "Blank",
    description: "The fastest start. Two colors, three roles, five named variations. Swap the seed colors and you have a working system in under a minute.",
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
        { name: "Subtle",  shorthand: "1" },
        { name: "Soft",    shorthand: "2" },
        { name: "Default", shorthand: "3" },
        { name: "Strong",  shorthand: "4" },
        { name: "Bold",    shorthand: "5" },
      ],

      colors: [
        { name: "Brand",   shorthand: "br", value: "3B82F6", description: "Primary brand color — replace with your own" },
        { name: "Neutral", shorthand: "ne", value: "94A3B8", description: "Neutral gray — surfaces, borders, and text" },
      ],

      roles: [
        {
          name: "Background",
          shorthand: "bg",
          minContrast: 1.0,
          variationTargets: [1.0, 1.1, 1.3, 1.6, 2.0],
          description: "Page and card backgrounds",
        },
        {
          name: "Border",
          shorthand: "bd",
          minContrast: 1.5,
          variationTargets: [1.5, 2.0, 2.5, 3.0, 3.5],
          description: "Borders, dividers, and outlines",
        },
        {
          name: "Text",
          shorthand: "tx",
          minContrast: 4.5,
          variationTargets: [3.0, 4.5, 7.0, 10.0, 14.0],
          description: "Text labels — subtle hint through bold heading",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F172A" },
      ],
    },
  },
];
