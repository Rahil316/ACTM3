/**
 * Material Design 3 preset.
 * Tonal mode, Material algorithm, scaleLength=25.
 * variationTargets = ramp step indices (0–24).
 *
 * Architecture mirrors M3's HCT tonal palette:
 *   Primary / Secondary / Tertiary / Error / Neutral
 * Role naming follows M3 token hierarchy. The '/' creates Figma folder groups
 * matching M3's published variable structure exactly.
 *
 * Step reference (Natural algo, 25-step, chromatic seed):
 *   0–4   = 1.0–1.5:1  →  surface/dim
 *   5–9   = 1.5–2.5:1  →  container tones
 *   10–14 = 2.5–5.5:1  →  variant/border tones
 *   15–19 = 5.5–13:1   →  on-container text
 *   20–24 = 13–21:1    →  on-primary / inverse text
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
      baseSelection: "By Contrast",
      spreadUnit: "steps",
      useGlobalAlgo: true,
      perColorAlgoScope: "color",
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      globalColorsCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      variableStructure: "color",
      includeTonalCollection: true,
      includeDescriptions: true,
      tonalScaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      perRoleControls: false,
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
          spread: 1,
          minContrast: 1.0,
          baseIndex: 2,
          variationOverride: true,
          roleVariations: [
            { name: "Surface/Dim",           shorthand: "sdm" }, // step 1 — dimmest background (≈page tint)
            { name: "Surface/Default",        shorthand: "sdf" }, // step 2 — default page surface
            { name: "Surface/Bright",         shorthand: "sbr" }, // step 3 — elevated/brighter surface
            { name: "Container/Lowest",       shorthand: "clo" }, // step 3 — lowest container tone
            { name: "Container/Low",          shorthand: "cl"  }, // step 4 — low container (card bg)
            { name: "Container/Default",      shorthand: "cd"  }, // step 5 — mid container (M3 container)
            { name: "Container/High",         shorthand: "ch"  }, // step 6 — high container (pressed state)
            { name: "Container/Highest",      shorthand: "chh" }, // step 7 — highest container (selected)
          ],
          variationTargets: [1, 2, 3, 3, 4, 5, 6, 7],
          description: "M3 surface and container tone stack",
        },

        // ── On/Surface text ─────────────────────────────────────────────────
        // onSurface and onSurfaceVariant — readable over the container tones above.
        // step 17 ≈ 8:1 on white → strong readable body text
        // step 14 ≈ 4.5:1 → secondary / variant text
        {
          name: "On/Surface",
          shorthand: "osf",
          spread: 1,
          minContrast: 4.5,
          baseIndex: 17,
          variationOverride: true,
          roleVariations: [
            { name: "Default", shorthand: "d" }, // step 17 — primary on-surface text
            { name: "Variant", shorthand: "v" }, // step 14 — variant / secondary on-surface
          ],
          variationTargets: [17, 14],
          description: "Text rendered on surface and container backgrounds",
        },

        // ── Primary scheme roles ─────────────────────────────────────────────
        // Global 3-variation pattern: Default=actionable fill, Container=tinted bg, On=inverse text
        {
          name: "Scheme/Primary",
          shorthand: "sp",
          spread: 1,
          minContrast: 4.5,
          baseIndex: 14,
          variationTargets: [14, 6, 21],
          description: "Primary color roles: fill, container background, and on-primary text",
        },

        // ── Secondary scheme roles ───────────────────────────────────────────
        {
          name: "Scheme/Secondary",
          shorthand: "ss",
          spread: 1,
          minContrast: 4.5,
          baseIndex: 14,
          variationTargets: [14, 6, 21],
          description: "Secondary color roles: fill, container background, and on-secondary text",
        },

        // ── Tertiary scheme roles ────────────────────────────────────────────
        {
          name: "Scheme/Tertiary",
          shorthand: "st",
          spread: 1,
          minContrast: 4.5,
          baseIndex: 14,
          variationTargets: [14, 6, 21],
          description: "Tertiary accent roles: fill, container background, and on-tertiary text",
        },

        // ── Error scheme roles ───────────────────────────────────────────────
        {
          name: "Scheme/Error",
          shorthand: "se",
          spread: 1,
          minContrast: 4.5,
          baseIndex: 14,
          variationTargets: [14, 6, 21],
          description: "Error state roles: fill, container background, and on-error text",
        },

        // ── Outline ──────────────────────────────────────────────────────────
        // Neutral key color used for borders/dividers.
        // Default ≈ step 12 (visible UI border), Variant ≈ step 9 (subtle divider)
        {
          name: "Outline",
          shorthand: "ol",
          spread: 1,
          minContrast: 2.0,
          baseIndex: 12,
          variationOverride: true,
          roleVariations: [
            { name: "Default", shorthand: "d" }, // step 12 — M3 outline (interactive border)
            { name: "Variant", shorthand: "v" }, // step 9  — M3 outlineVariant (dividers)
          ],
          variationTargets: [12, 9],
          description: "Border and divider strokes",
        },

        // ── Scrim / overlay ──────────────────────────────────────────────────
        // Single-variation role for modal scrims. step 22 ≈ near-opaque dark overlay.
        {
          name: "Scrim",
          shorthand: "sc",
          spread: 1,
          minContrast: 1.0,
          baseIndex: 22,
          variationOverride: true,
          roleVariations: [
            { name: "Default", shorthand: "d" },
          ],
          variationTargets: [22],
          description: "Modal scrim / backdrop overlay",
        },

        // ── Inverse surface ──────────────────────────────────────────────────
        // step 21 = near-black inverse surface, step 3 = near-white inverse-on-surface text
        {
          name: "Inverse/Surface",
          shorthand: "isf",
          spread: 1,
          minContrast: 7.0,
          baseIndex: 21,
          variationOverride: true,
          roleVariations: [
            { name: "Surface",    shorthand: "sf" }, // step 21 — inverse (dark) surface
            { name: "On/Surface", shorthand: "os" }, // step 3  — text on inverse surface
            { name: "Primary",    shorthand: "pr" }, // step 8  — tinted inverse action button
          ],
          variationTargets: [21, 3, 8],
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
