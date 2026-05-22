/**
 * Radix UI preset.
 * Scale mode, Natural algorithm, scaleLength=12.
 * variationTargets = WCAG contrast ratios matching Radix's documented step intents.
 *
 * Radix's 12-step scale has fixed semantic meanings per step.
 * Each variation's contrast target lines up with the contrast intent Radix
 * documents for that step. The '/' in variation names creates Figma folder
 * groups that mirror Radix's token namespace.
 *
 * Radix step semantics (official docs):
 *   1  = App background           7  = UI element border and focus rings
 *   2  = Subtle background        8  = Hovered UI element border
 *   3  = UI element background    9  = Solid backgrounds
 *   4  = Hovered UI element bg   10  = Hovered solid backgrounds
 *   5  = Active / selected bg    11  = Low-contrast text
 *   6  = Subtle borders          12  = High-contrast text
 */

const RADIX_PRESETS = [
  {
    id: "radix-ui",
    name: "Radix UI",
    badge: "Radix",
    description: "Radix's 12-step semantic scale with named step purposes as Figma folder groups. Works with any Radix-based design system (shadcn/ui, Radix Themes).",
    tags: ["radix", "shadcn", "oklch", "12-step", "react"],
    swatches: ["0091FF", "8E8096", "EB5757", "30A46C"],
    config: {
      name: "Radix UI",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 12,
      useGlobalAlgo: true,
      perColorAlgoScope: "color",
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: true,
      useShorthandRoles: false,
      useShorthandVariations: true,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: true,
      alphaValues: "5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95",
      variableStructure: "color",
      includeTonalCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      perRoleControls: false,
      scaleStepNames: [],

      // 12 global variations — one per Radix step — named after their documented purposes.
      // '/' groups them into Figma folders: BG/App, BG/Subtle, Element/BG, etc.
      variations: [
        { name: "BG/App",            shorthand: "1"  }, // step 0  — page/app background
        { name: "BG/Subtle",         shorthand: "2"  }, // step 1  — subtle background tint
        { name: "Element/BG",        shorthand: "3"  }, // step 2  — UI element background (default state)
        { name: "Element/BG/Hover",  shorthand: "4"  }, // step 3  — hovered element background
        { name: "Element/BG/Active", shorthand: "5"  }, // step 4  — active/selected element background
        { name: "Border/Subtle",     shorthand: "6"  }, // step 5  — subtle separator/border
        { name: "Border/UI",         shorthand: "7"  }, // step 6  — UI element border / focus ring
        { name: "Border/UI/Hover",   shorthand: "8"  }, // step 7  — hovered border
        { name: "Solid/BG",          shorthand: "9"  }, // step 8  — solid fill (primary button bg)
        { name: "Solid/BG/Hover",    shorthand: "10" }, // step 9  — hovered solid fill
        { name: "Text/Low",          shorthand: "11" }, // step 10 — low-contrast supplementary text
        { name: "Text/High",         shorthand: "12" }, // step 11 — high-contrast primary text
      ],

      colors: [
        { name: "Blue",  shorthand: "bl", value: "0091FF", description: "Radix blue scale seed" },
        { name: "Mauve", shorthand: "mv", value: "8E8096", description: "Radix mauve neutral (purple-tinted gray)" },
        { name: "Red",   shorthand: "rd", value: "EB5757", description: "Radix red — error / destructive" },
        { name: "Green", shorthand: "gr", value: "30A46C", description: "Radix green — success / positive" },
      ],

      // All roles share the same 12 global variations.
      // Radix's model is purely step-indexed; role distinction is purely by color.
      // variationTargets = [0,1,2,3,4,5,6,7,8,9,10,11] — identity mapping.
      roles: [
        {
          name: "Scale",
          shorthand: "sc",
          minContrast: 1.0,
          variationTargets: [1.0, 1.05, 1.1, 1.15, 1.2, 1.5, 2.0, 2.5, 4.5, 5.5, 3.0, 7.0],
          description: "Full 12-step Radix scale — all semantic steps exposed as named variations",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "111113" },
      ],
    },
  },
];
