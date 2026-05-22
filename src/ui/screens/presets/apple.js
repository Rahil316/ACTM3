/**
 * Apple HIG preset.
 * Direct mode, natural solver.
 * variationTargets = WCAG contrast ratios (1.0–21.0).
 *
 * Apple's semantic color system uses a 4-tier hierarchy for both labels and fills,
 * plus distinct Background and Separator stacks. The naming mirrors Apple's published
 * UIColor/NSColor system color names exactly so designers recognize them immediately.
 *
 * includeSourceColors: true — emits raw brand hex values to a fixed '_constants'
 * collection, matching Apple's requirement for fixed-hex system colors (systemBlue,
 * systemRed, etc.) that never change per theme. These are reference primitives only.
 *
 * Global 4-tier hierarchy (applies to Label and Fill families):
 *   Primary     = 7.0:1  → systemLabel / systemFill (full opacity intent)
 *   Secondary   = 4.5:1  → secondaryLabel / secondaryFill
 *   Tertiary    = 3.0:1  → tertiaryLabel / tertiaryFill
 *   Quaternary  = 2.0:1  → quaternaryLabel / quaternaryFill
 *
 * Solver finds exact lightness meeting ≥ target in each theme.
 * On Light (bg #F2F2F7): Primary finds near-black, Quaternary finds medium gray.
 * On Dark (bg #000000):  Primary finds near-white, Quaternary finds dim gray.
 */

const APPLE_PRESETS = [
  {
    id: "apple-hig",
    name: "Apple HIG",
    badge: "Apple",
    description: "iOS/macOS semantic hierarchy. Label, Fill, Background, and Separator stacks with fixed system color primitives.",
    tags: ["apple", "ios", "macos", "hig", "adaptive", "system-colors"],
    swatches: ["007AFF", "FF3B30", "34C759", "FF9500", "8E8E93"],
    config: {
      name: "Apple HIG",
      pluginMode: "direct",
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
      includeSourceColors: true,
      sourceCollectionName: "_system-colors",
      includeAlphaTints: true,
      alphaValues: "8, 16, 32, 50, 70, 85",
      tokenGrouping: "color",
      includeColorScalesCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      
      scaleStepNames: [],

      // Global 4-tier label/fill hierarchy.
      // Maps directly to Apple's UIColor systemLabel → quaternaryLabel naming.
      variations: [
        { name: "Primary",    shorthand: "1" }, // 7.0:1 — full-opacity label intent
        { name: "Secondary",  shorthand: "2" }, // 4.5:1 — secondary label (60% opacity equivalent)
        { name: "Tertiary",   shorthand: "3" }, // 3.0:1 — tertiary label (30% opacity equivalent)
        { name: "Quaternary", shorthand: "4" }, // 2.0:1 — quaternary label (18% opacity equivalent)
      ],

      colors: [
        { name: "System/Blue",   shorthand: "bl", value: "007AFF", description: "systemBlue — primary interactive tint" },
        { name: "System/Red",    shorthand: "rd", value: "FF3B30", description: "systemRed — destructive actions" },
        { name: "System/Green",  shorthand: "gr", value: "34C759", description: "systemGreen — success / go" },
        { name: "System/Orange", shorthand: "or", value: "FF9500", description: "systemOrange — warnings / attention" },
        { name: "System/Gray",   shorthand: "gy", value: "8E8E93", description: "systemGray — neutral fills and borders" },
      ],

      roles: [
        // ── Label family ────────────────────────────────────────────────────
        // Uses global 4-tier variations. Contrast targets match Apple's opacity-based
        // rendering intent on standard backgrounds.
        {
          name: "Label",
          shorthand: "lb",
          minContrast: 4.5,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Text label hierarchy — label / secondaryLabel / tertiaryLabel / quaternaryLabel",
        },

        // ── Fill family ──────────────────────────────────────────────────────
        // System fills for interactive controls (toggle thumbs, button backgrounds).
        // Lower contrast targets since fills serve as backgrounds, not readable text.
        {
          name: "Fill",
          shorthand: "fi",
          minContrast: 1.5,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "System fill hierarchy for interactive control surfaces",
        },

        // ── Background family ────────────────────────────────────────────────
        // systemBackground / secondarySystemBackground / tertiarySystemBackground
        // Per-role override — 3 tiers only, lighter targets than labels.
        {
          name: "Background",
          shorthand: "bg",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "Default",   shorthand: "d" }, // 1.0:1 — systemBackground (pure white / pure black)
            { name: "Secondary", shorthand: "s" }, // 1.1:1 — secondarySystemBackground (grouped table bg)
            { name: "Tertiary",  shorthand: "t" }, // 1.2:1 — tertiarySystemBackground (nested groups)
          ],
          variationTargets: [1.0, 1.1, 1.2],
          description: "System background hierarchy — page / grouped / nested surface",
        },

        // ── Grouped background ───────────────────────────────────────────────
        // systemGroupedBackground — slightly different from systemBackground in dark mode.
        {
          name: "Background/Grouped",
          shorthand: "bgg",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "Default",   shorthand: "d" }, // 1.0:1 — grouped page background
            { name: "Secondary", shorthand: "s" }, // 1.1:1 — inset table / card
            { name: "Tertiary",  shorthand: "t" }, // 1.2:1 — deeply nested card
          ],
          variationTargets: [1.0, 1.15, 1.3],
          description: "Grouped-style (UITableView insetGrouped) background hierarchy",
        },

        // ── Separator ────────────────────────────────────────────────────────
        // systemSeparator / systemOpaqueSeparator
        // Per-role override — 2 tiers.
        {
          name: "Separator",
          shorthand: "sp",
          minContrast: 1.5,
          customVariationList: true,
          customVariations: [
            { name: "Translucent", shorthand: "tr" }, // 1.5:1 — alpha-blended hairline divider
            { name: "Opaque",      shorthand: "op" }, // 2.5:1 — non-translucent separator (for screenshots)
          ],
          variationTargets: [1.5, 2.5],
          description: "Separator lines — translucent hairline and opaque fallback",
        },

        // ── Interactive tint (uses global 4-tier) ────────────────────────────
        // The primary tint color (systemBlue) rendered in all 4 label-like states.
        {
          name: "Tint",
          shorthand: "ti",
          minContrast: 3.0,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Interactive tint — primary accent in all four opacity tiers",
        },

        // ── Status colors (use global 4-tier) ────────────────────────────────
        {
          name: "Status/Error",
          shorthand: "er",
          minContrast: 3.0,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Error / destructive semantic hierarchy",
        },
        {
          name: "Status/Success",
          shorthand: "su",
          minContrast: 3.0,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Success / confirmation semantic hierarchy",
        },
        {
          name: "Status/Warning",
          shorthand: "wa",
          minContrast: 3.0,
          variationTargets: [7.0, 4.5, 3.0, 2.0],
          description: "Warning / attention semantic hierarchy",
        },
      ],

      themes: [
        { name: "Light", bg: "F2F2F7" },
        { name: "Dark",  bg: "000000" },
      ],
    },
  },
];
