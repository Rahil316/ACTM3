/**
 * Tailwind CSS preset.
 * Tonal mode, Natural algorithm, scaleLength=11.
 * variationTargets = ramp step indices 0–10 (one-to-one with Tailwind's 11 scale stops).
 *
 * Tailwind's color scale uses 11 named stops: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950.
 * Each maps directly to a step index (50→0, 100→1, …, 950→10).
 * The '/' in variation names groups them under a "Scale" folder in Figma variables.
 *
 * scaleLength=11 means the engine generates exactly 11 steps per color, so variationTargets
 * are the identity mapping [0,1,2,3,4,5,6,7,8,9,10].
 *
 * Step intent reference (Natural, 11 steps):
 *   0  (50)  = 1.0–1.2:1 → near-white tint / page wash
 *   1  (100) = 1.2–1.5:1 → subtle background
 *   2  (200) = 1.5–2.0:1 → light surface
 *   3  (300) = 2.0–3.0:1 → border / placeholder
 *   4  (400) = 3.0–4.0:1 → muted icon / disabled
 *   5  (500) = 4.0–5.5:1 → primary brand fill (AA large text)
 *   6  (600) = 5.5–7.0:1 → hover state / strong fill
 *   7  (700) = 7.0–9.0:1 → pressed / AA text
 *   8  (800) = 9.0–12:1  → strong text / AAA
 *   9  (900) = 12–16:1   → near-black text
 *  10  (950) = 16–21:1   → darkest text / inverse surface
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
      useGlobalAlgo: true,
      perColorAlgoScope: "color",
      solverMode: "natural",
      tokenNameOrder: ["color", "variation"],
      useShorthandColors: true,
      useShorthandRoles: false,
      useShorthandVariations: true,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      variableStructure: "color",
      includeTonalCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      perRoleControls: false,
      scaleStepNames: [],

      // 11 global variations named after Tailwind's step numbers.
      // tokenNameOrder: ["color", "variation"] — no role segment, so variables appear as
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
      // by step number. tokenNameOrder excludes role so output matches Tailwind's flat namespace.
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
