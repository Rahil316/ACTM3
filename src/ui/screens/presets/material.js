/**
 * Material Design 3 preset.
 * Scale mode, Natural algorithm, scaleLength=25.
 * variationTargets = WCAG contrast ratios (1.0 – 21.0).
 *
 * Architecture mirrors M3's HCT tonal palette:
 *   Primary / Secondary / Tertiary / Error / Neutral
 * Role naming follows M3 token hierarchy. The '/' creates Figma folder groups
 * matching M3's published variable structure exactly.
 */

const MATERIAL_PRESETS = [
  {
    id: "material-3",
    name: "Material Design 3",
    badge: "M3",
    description: "Google's M3 HCT tonal palette. On/Container/Surface architecture with full Figma variable folder nesting.",
    tags: ["google", "material", "m3", "tonal", "hct"],
    swatches: ["6750A4", "625B71", "7D5260", "B3261E", "605D62"],
    config: {
      name: "Material Design 3",
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
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      
      scaleStepNames: [],

      // M3 global variations: 3 semantic tone roles
      // Tone/Default  = step 14 → body text / primary actions (≈4.5:1 on white)
      // Tone/Container = step 6  → container fills / subtle surfaces
      // Tone/On       = step 21 → on-primary text (high contrast inverse)
      variations: [
        { name: "Tone/Default",   shorthand: "d" },
        { name: "Tone/Container", shorthand: "c" },
        { name: "Tone/On",        shorthand: "o" },
      ],

      colors: [
        { name: "Color/Primary",   shorthand: "pr",  value: "6750A4", description: "M3 primary key color" },
        { name: "Color/Secondary", shorthand: "se",  value: "625B71", description: "M3 secondary key color" },
        { name: "Color/Tertiary",  shorthand: "te",  value: "7D5260", description: "M3 tertiary key color" },
        { name: "Color/Error",     shorthand: "er",  value: "B3261E", description: "M3 error key color" },
        { name: "Color/Neutral",   shorthand: "ne",  value: "605D62", description: "M3 neutral key color (surfaces/outlines)" },
      ],

      roles: [
        // ── Surface family ──────────────────────────────────────────────────
        // M3 surfaces are the Neutral key color (surfaces inherit the hue of neutral).
        // 8-step hierarchy matching M3's surfaceDim → containerHighest progression.
        {
          name: "Surface",
          shorthand: "sf",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "Surface/Dim",           shorthand: "sdm" }, // step 1 — dimmest background (≈page tint)
            { name: "Surface/Default",        shorthand: "sdf" }, // step 2 — default page surface
            { name: "Surface/Bright",         shorthand: "sbr" }, // step 3 — elevated/brighter surface
            { name: "Container/Lowest",       shorthand: "clo" }, // step 3 — lowest container tone
            { name: "Container/Low",          shorthand: "cl"  }, // step 4 — low container (card bg)
            { name: "Container/Default",      shorthand: "cd"  }, // step 5 — mid container (M3 container)
            { name: "Container/High",         shorthand: "ch"  }, // step 6 — high container (pressed state)
            { name: "Container/Highest",      shorthand: "chh" }, // step 7 — highest container (selected)
          ],
          variationTargets: [1.0, 1.05, 1.1, 1.1, 1.2, 1.3, 1.5, 1.7],
          description: "M3 surface and container tone stack",
        },

        // ── On/Surface text ─────────────────────────────────────────────────
        // onSurface and onSurfaceVariant — readable over the container tones above.
        // step 17 ≈ 8:1 on white → strong readable body text
        // step 14 ≈ 4.5:1 → secondary / variant text
        {
          name: "On/Surface",
          shorthand: "osf",
          minContrast: 4.5,
          customVariationList: true,
          customVariations: [
            { name: "Default", shorthand: "d" }, // step 17 — primary on-surface text
            { name: "Variant", shorthand: "v" }, // step 14 — variant / secondary on-surface
          ],
          variationTargets: [7.0, 4.5],
          description: "Text rendered on surface and container backgrounds",
        },

        // ── Primary scheme roles ─────────────────────────────────────────────
        // Global 3-variation pattern: Default=actionable fill, Container=tinted bg, On=inverse text
        {
          name: "Scheme/Primary",
          shorthand: "sp",
          minContrast: 4.5,
          variationTargets: [4.5, 1.5, 14.0],
          description: "Primary color roles: fill, container background, and on-primary text",
        },
        {
          name: "Scheme/Secondary",
          shorthand: "ss",
          minContrast: 4.5,
          variationTargets: [4.5, 1.5, 14.0],
          description: "Secondary color roles: fill, container background, and on-secondary text",
        },
        {
          name: "Scheme/Tertiary",
          shorthand: "st",
          minContrast: 4.5,
          variationTargets: [4.5, 1.5, 14.0],
          description: "Tertiary accent roles: fill, container background, and on-tertiary text",
        },
        {
          name: "Scheme/Error",
          shorthand: "se",
          minContrast: 4.5,
          variationTargets: [4.5, 1.5, 14.0],
          description: "Error state roles: fill, container background, and on-error text",
        },

        // ── Outline ──────────────────────────────────────────────────────────
        // Neutral key color used for borders/dividers.
        // Default ≈ step 12 (visible UI border), Variant ≈ step 9 (subtle divider)
        {
          name: "Outline",
          shorthand: "ol",
          minContrast: 2.0,
          customVariationList: true,
          customVariations: [
            { name: "Default", shorthand: "d" }, // step 12 — M3 outline (interactive border)
            { name: "Variant", shorthand: "v" }, // step 9  — M3 outlineVariant (dividers)
          ],
          variationTargets: [2.5, 1.8],
          description: "Border and divider strokes",
        },

        // ── Scrim / overlay ──────────────────────────────────────────────────
        // Single-variation role for modal scrims. step 22 ≈ near-opaque dark overlay.
        {
          name: "Scrim",
          shorthand: "sc",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "Default", shorthand: "d" },
          ],
          variationTargets: [14.0],
          description: "Modal scrim / backdrop overlay",
        },

        // ── Inverse surface ──────────────────────────────────────────────────
        // step 21 = near-black inverse surface, step 3 = near-white inverse-on-surface text
        {
          name: "Inverse/Surface",
          shorthand: "isf",
          minContrast: 7.0,
          customVariationList: true,
          customVariations: [
            { name: "Surface",    shorthand: "sf" }, // step 21 — inverse (dark) surface
            { name: "On/Surface", shorthand: "os" }, // step 3  — text on inverse surface
            { name: "Primary",    shorthand: "pr" }, // step 8  — tinted inverse action button
          ],
          variationTargets: [14.0, 1.1, 2.5],
          description: "Inverse surface stack for snackbars and reverse-mode panels",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFBFE" },
        { name: "Dark",  bg: "1C1B1F" },
      ],
    },
  },
];
