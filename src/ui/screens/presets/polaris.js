/**
 * Shopify Polaris preset.
 * Adaptive mode, natural solver.
 * variationTargets = WCAG contrast ratios (1.0–21.0).
 *
 * Polaris token architecture: Background / Surface / Text / Border / Icon / Interactive.
 * Status channels: Brand / Info / Success / Caution / Critical / Magic.
 * The naming mirrors Polaris's published token names so Shopify developers recognize
 * them immediately.
 *
 * Global 5-state interaction model (for interactive components):
 *   Default   = 4.5:1 → resting state meets AA text minimum (Polaris's standard)
 *   Hover     = 5.5:1 → one stop higher contrast (perceptible on both themes)
 *   Pressed   = 6.5:1 → active / mouse-down — clearly darker
 *   Selected  = 7.0:1 → selected / checked — AAA intent
 *   Disabled  = 2.0:1 → clearly below action threshold
 *
 * Per-role overrides cover:
 *   BG stack (page / subdued / hover) — very low contrast ratios (backgrounds)
 *   Text stack (default / subdued / critical / disabled)
 *   Feedback channels (BG/Subtle, BG/Default, FG, Border)
 *   Border (default / subdued / interactive)
 */

const POLARIS_PRESETS = [
  {
    id: "shopify-polaris",
    name: "Shopify Polaris",
    badge: "Polaris",
    description: "Shopify Polaris commerce token architecture. Brand/Info/Success/Caution/Critical/Magic with full interaction state coverage.",
    tags: ["shopify", "polaris", "commerce", "adaptive", "ecommerce"],
    swatches: ["303ADE", "8C9196", "007B5E", "916A00", "CC1515", "7B2EA8"],
    config: {
      name: "Shopify Polaris",
      pluginMode: "direct",
      scaleAlgorithm: "Natural",
      scaleLength: 25,
      useGlobalAlgo: true,
      perColorAlgoScope: "color",
      solverMode: "natural",
      tokenNameOrder: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: true,
      useShorthandSteps: false,
      embedDirectly: false,
      includeGlobalColors: false,
      sourceCollectionName: "global",
      includeAlphaTints: false,
      alphaValues: "5, 10, 20, 25, 50, 75, 80, 90, 95",
      variableStructure: "color",
      includeTonalCollection: false,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      perRoleControls: false,
      scaleStepNames: [],

      // Global 5-state interaction model.
      variations: [
        { name: "State/Default",  shorthand: "d"  }, // 4.5:1 — resting interactive state
        { name: "State/Hover",    shorthand: "h"  }, // 5.5:1 — hover
        { name: "State/Pressed",  shorthand: "p"  }, // 6.5:1 — pressed / active
        { name: "State/Selected", shorthand: "s"  }, // 7.0:1 — selected / checked
        { name: "State/Disabled", shorthand: "ds" }, // 2.0:1 — disabled
      ],

      colors: [
        { name: "Color/Brand",    shorthand: "br", value: "303ADE", description: "Polaris brand blue — primary actions" },
        { name: "Color/Neutral",  shorthand: "ne", value: "8C9196", description: "Polaris neutral gray — surfaces and UI chrome" },
        { name: "Color/Success",  shorthand: "su", value: "007B5E", description: "Polaris success green" },
        { name: "Color/Caution",  shorthand: "ca", value: "916A00", description: "Polaris caution yellow-brown" },
        { name: "Color/Critical", shorthand: "cr", value: "CC1515", description: "Polaris critical red — errors, destructive actions" },
        { name: "Color/Magic",    shorthand: "ma", value: "7B2EA8", description: "Polaris magic purple — AI / smart features" },
      ],

      roles: [
        // ── Interactive roles (global 5-state) ───────────────────────────────
        {
          name: "Action/Primary",
          shorthand: "ap",
          minContrast: 4.5,
          variationTargets: [4.5, 5.5, 6.5, 7.0, 2.0],
          description: "Primary action fills (CTA buttons, primary links)",
        },
        {
          name: "Action/Secondary",
          shorthand: "as",
          minContrast: 4.5,
          variationTargets: [4.5, 5.5, 6.5, 7.0, 2.0],
          description: "Secondary action fills (outline buttons, secondary CTAs)",
        },

        // ── Background stack ─────────────────────────────────────────────────
        // Polaris uses a page / subdued / hover hierarchy for background surfaces.
        {
          name: "Background",
          shorthand: "bg",
          minContrast: 1.0,
          variationOverride: true,
          roleVariations: [
            { name: "Default",  shorthand: "d" }, // 1.0:1 — page background (near-white)
            { name: "Subdued",  shorthand: "s" }, // 1.15:1 — subdued page (section divider)
            { name: "Hover",    shorthand: "h" }, // 1.3:1 — hover state on background
          ],
          variationTargets: [1.0, 1.15, 1.3],
          description: "Page and section background fills",
        },

        // ── Surface stack ────────────────────────────────────────────────────
        // Cards, popovers, modals.
        {
          name: "Surface",
          shorthand: "sf",
          minContrast: 1.0,
          variationOverride: true,
          roleVariations: [
            { name: "Default",  shorthand: "d" }, // 1.0:1 — card / popover
            { name: "Raised",   shorthand: "r" }, // 1.05:1 — elevated card (e.g. dragging)
            { name: "Overlay",  shorthand: "o" }, // 1.1:1 — modal / sheet
            { name: "Subdued",  shorthand: "s" }, // 1.2:1 — subdued surface (deemphasized panel)
          ],
          variationTargets: [1.0, 1.05, 1.1, 1.2],
          description: "Card, popover, and modal surface fills",
        },

        // ── Text roles ───────────────────────────────────────────────────────
        {
          name: "Text",
          shorthand: "tx",
          minContrast: 4.5,
          variationOverride: true,
          roleVariations: [
            { name: "Default",  shorthand: "d"  }, // 7.0:1 — body text
            { name: "Subdued",  shorthand: "s"  }, // 4.5:1 — secondary / helper text
            { name: "Critical", shorthand: "c"  }, // 4.5:1 — error text
            { name: "Disabled", shorthand: "ds" }, // 2.0:1 — disabled label
          ],
          variationTargets: [7.0, 4.5, 4.5, 2.0],
          description: "Text label hierarchy — default, subdued, critical, disabled",
        },

        // ── Border roles ─────────────────────────────────────────────────────
        {
          name: "Border",
          shorthand: "bo",
          minContrast: 2.0,
          variationOverride: true,
          roleVariations: [
            { name: "Default",     shorthand: "d" }, // 2.0:1 — standard UI border
            { name: "Subdued",     shorthand: "s" }, // 1.5:1 — divider / subtle border
            { name: "Interactive", shorthand: "i" }, // 3.0:1 — focus ring / interactive border
          ],
          variationTargets: [2.0, 1.5, 3.0],
          description: "Border and divider strokes",
        },

        // ── Icon roles (uses global 5-state via explicit targets) ────────────
        {
          name: "Icon",
          shorthand: "ic",
          minContrast: 3.0,
          variationTargets: [4.5, 5.5, 6.5, 7.0, 2.0],
          description: "Iconography fills — same 5-state interaction model as actions",
        },

        // ── Feedback channels — Status/Success ───────────────────────────────
        {
          name: "Status/Success",
          shorthand: "ssu",
          minContrast: 1.3,
          variationOverride: true,
          roleVariations: [
            { name: "BG/Subtle",  shorthand: "bgs" },
            { name: "BG/Default", shorthand: "bgd" },
            { name: "FG",         shorthand: "fg"  },
            { name: "Border",     shorthand: "bo"  },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Success feedback channel",
        },

        // ── Status/Caution ───────────────────────────────────────────────────
        {
          name: "Status/Caution",
          shorthand: "sca",
          minContrast: 1.3,
          variationOverride: true,
          roleVariations: [
            { name: "BG/Subtle",  shorthand: "bgs" },
            { name: "BG/Default", shorthand: "bgd" },
            { name: "FG",         shorthand: "fg"  },
            { name: "Border",     shorthand: "bo"  },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Caution/warning feedback channel",
        },

        // ── Status/Critical ──────────────────────────────────────────────────
        {
          name: "Status/Critical",
          shorthand: "scr",
          minContrast: 1.3,
          variationOverride: true,
          roleVariations: [
            { name: "BG/Subtle",  shorthand: "bgs" },
            { name: "BG/Default", shorthand: "bgd" },
            { name: "FG",         shorthand: "fg"  },
            { name: "Border",     shorthand: "bo"  },
          ],
          variationTargets: [1.3, 1.8, 4.5, 2.5],
          description: "Critical/error feedback channel",
        },

        // ── Status/Magic ─────────────────────────────────────────────────────
        // Polaris Magic is Shopify's AI brand expression. Slightly elevated FG target
        // since Magic often appears on rich surfaces.
        {
          name: "Status/Magic",
          shorthand: "sma",
          minContrast: 1.3,
          variationOverride: true,
          roleVariations: [
            { name: "BG/Subtle",  shorthand: "bgs" },
            { name: "BG/Default", shorthand: "bgd" },
            { name: "FG",         shorthand: "fg"  },
            { name: "Border",     shorthand: "bo"  },
          ],
          variationTargets: [1.3, 1.8, 5.5, 2.5],
          description: "Magic (AI) brand feedback channel — slightly elevated FG contrast",
        },
      ],

      themes: [
        { name: "Light",   bg: "FAFBFB" },
        { name: "Dark",    bg: "1A1A1A" },
        { name: "Inverse", bg: "1A1F36" },
      ],
    },
  },
];
