/**
 * Tailwind CSS preset.
 * Scale mode, Natural algorithm, scaleLength=11.
 * variationTargets = WCAG contrast ratios matching Tailwind's 11 stop intents.
 *
 * Tailwind's color scale uses 11 named stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.
 * Each variation's contrast target lines up with the contrast intent of that stop.
 * The '/' in variation names groups them under a "Scale" folder in Figma variables.
 */

const TAILWIND_PRESETS = [
  {
    id: "tailwind-css",
    name: "Tailwind CSS",
    badge: "TW",
    description: "Tailwind's 11-stop utility palette. Variation names are the Tailwind step numbers (50–950) for a frictionless handoff from design to code.",
    tags: ["tailwind", "utility", "11-step", "css", "react", "nextjs"],
    swatches: ["64748B", "3B82F6", "8B5CF6", "F43F5E"],
    config: {
      name: "Tailwind CSS",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 11,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["color", "variation"],
      useShorthandColors: true,
      useShorthandRoles: false,
      useShorthandVariations: true,
      useShorthandSteps: false,
      resolveTokensDirectly: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      tokenGrouping: "color",
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      
      scaleStepNames: [],

      // 11 global variations named after Tailwind's step numbers.
      // tokenNameSegments: ["color", "variation"] — no role segment, so variables appear as
      // "Slate/Scale/50", "Blue/Scale/500", etc. in Figma — matching Tailwind's CSS class names.
      variations: [
        { name: "Scale/50",  shorthand: "50"  }, // step 0  — near-white
        { name: "Scale/100", shorthand: "100" }, // step 1  — very light
        { name: "Scale/200", shorthand: "200" }, // step 2  — light
        { name: "Scale/300", shorthand: "300" }, // step 3  — light-mid
        { name: "Scale/400", shorthand: "400" }, // step 4  — mid-light (muted icon)
        { name: "Scale/500", shorthand: "500" }, // step 5  — mid (primary brand fill)
        { name: "Scale/600", shorthand: "600" }, // step 6  — mid-dark (hover)
        { name: "Scale/700", shorthand: "700" }, // step 7  — dark (AA body text)
        { name: "Scale/800", shorthand: "800" }, // step 8  — very dark (AAA text)
        { name: "Scale/900", shorthand: "900" }, // step 9  — near-black
        { name: "Scale/950", shorthand: "950" }, // step 10 — darkest
      ],

      colors: [
        { name: "Slate",  shorthand: "sl", value: "64748B", description: "slate — blue-gray neutral" },
        { name: "Blue",   shorthand: "bl", value: "3B82F6", description: "blue — primary interactive" },
        { name: "Violet", shorthand: "vi", value: "8B5CF6", description: "violet — accent" },
        { name: "Rose",   shorthand: "ro", value: "F43F5E", description: "rose — error / destructive" },
      ],

      // Single "Scale" role. Tailwind has no semantic role layer — colors are used directly
      // by step number. tokenNameSegments excludes role so output matches Tailwind's flat namespace.
      roles: [
        {
          name: "Scale",
          shorthand: "sc",
          minContrast: 1.0,
          variationTargets: [1.0, 1.1, 1.3, 1.6, 2.5, 4.0, 5.5, 7.5, 11.0, 16.0, 20.0],
          description: "Full 11-stop Tailwind scale — step numbers as variation variations",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark",  bg: "0F172A" },
      ],
    },
  },
];
