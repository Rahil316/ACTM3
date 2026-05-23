/**
 * Material Design 3 preset.
 *
 * Role = the color family (primary, surface, outline…)
 * Variations = the slots within that family (default, on, container, on-container…)
 *
 * Figma folder structure:
 *   primary/          default · on · container · on-container · inverse · tint
 *   secondary/        default · on · container · on-container
 *   tertiary/         default · on · container · on-container
 *   error/            default · on · container · on-container
 *   surface/          default · dim · bright · on · variant · on-variant
 *   surface/container/  lowest · low · default · high · highest
 *   background/       default · on
 *   outline/          default · variant
 *   inverse/          surface · on-surface
 *   scrim/            default
 *   shadow/           default
 *
 * CSS variable mapping (strip nothing, just replace "/" with "-" after the root):
 *   primary/default        → --md-sys-color-primary
 *   primary/on             → --md-sys-color-on-primary
 *   primary/container      → --md-sys-color-primary-container
 *   surface/on             → --md-sys-color-on-surface
 *   surface/container/low  → --md-sys-color-surface-container-low
 *   outline/variant        → --md-sys-color-outline-variant
 *
 * Color source per role family:
 *   primary / secondary / tertiary / error  → their own key color
 *   surface / background / inverse / scrim / shadow  → Neutral (#605D62)
 *   outline / surface-variant slots / on-surface slots  → Neutral Variant (#7D7279)
 *
 * Contrast targets per slot (solved against theme bg #FFFBFE light / #1C1B1F dark):
 *   default fill          4.5   AA interactive element
 *   on (text on fill)    14.0   near-white in light, near-black in dark
 *   container             1.3   subtle tinted surface, tone ~90
 *   on-container         12.0   AAA text on tinted bg
 *   inverse               2.5   primary tone on dark panels
 *   tint                  4.5   primary as elevation tint (= default)
 *   surface/default       1.0   matches page bg
 *   surface/dim           1.07  slightly darker than surface
 *   surface/bright        1.0   lightest surface
 *   surface/on           10.0   strong body text
 *   surface/variant       1.2   chip/input fill
 *   surface/on-variant    4.5   secondary text AA
 *   container/*           1.0 · 1.07 · 1.15 · 1.22 · 1.3  (lowest→highest)
 *   background/default    1.0   page canvas
 *   background/on        10.0   body text on page
 *   outline/default       3.0   interactive border AA-large
 *   outline/variant       1.5   decorative divider
 *   inverse/surface      12.0   snackbar / tooltip bg
 *   inverse/on-surface    1.1   near-white text on snackbar
 *   scrim / shadow       16.0   darkest achievable in both themes
 */

import type { Preset } from '../types';

const presets: Preset[] = [
  {
    id: "material-3",
    name: "Material Design 3",
    badge: "M3",
    description: "Role = color family. Variations = M3 token slots. Figma folders mirror M3's hierarchy. Contrast calibrated per slot use case.",
    tags: ["google", "material", "m3", "tonal", "hct", "design-system"],
    swatches: ["6750A4", "625B71", "7D5260", "B3261E", "605D62", "7D7279"],
    config: {
      name: "Material Design 3",
      pluginMode: "scale",
      scaleAlgorithm: "Material",
      scaleLength: 25,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["role", "variation"],
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

      scaleStepNames: null,

      // Global variations — not used directly (all roles use customVariationList).
      // Defined so the config is valid.
      variations: [
        { name: "default", shorthand: "default" },
      ],

      // ── Key colors ──────────────────────────────────────────────────────────
      // color.name = top-level Figma group. tokenNameSegments["color"] is suppressed
      // by naming colors with a single empty-path label — the role carries the full path.
      // We name each color with an empty string so only role+variation appear in the path.
      colors: [
        { name: "primary",         shorthand: "primary",         value: "6750A4", description: "M3 Primary key color" },
        { name: "secondary",       shorthand: "secondary",       value: "625B71", description: "M3 Secondary key color" },
        { name: "tertiary",        shorthand: "tertiary",        value: "7D5260", description: "M3 Tertiary key color" },
        { name: "error",           shorthand: "error",           value: "B3261E", description: "M3 Error key color" },
        { name: "neutral",         shorthand: "neutral",         value: "605D62", description: "M3 Neutral — surfaces, backgrounds, shadow" },
        { name: "neutral-variant", shorthand: "neutral-variant", value: "7D7279", description: "M3 Neutral Variant — on-surface, outline" },
      ],

      roles: [

        // ── PRIMARY ─────────────────────────────────────────────────────────────
        // Color source: primary (#6750A4)
        {
          name: "primary",
          shorthand: "primary",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",      shorthand: "default"      }, // --md-sys-color-primary
            { name: "on",          shorthand: "on"           }, // --md-sys-color-on-primary
            { name: "container",   shorthand: "container"    }, // --md-sys-color-primary-container
            { name: "on-container", shorthand: "on-container" }, // --md-sys-color-on-primary-container
            { name: "inverse",     shorthand: "inverse"      }, // --md-sys-color-inverse-primary
            { name: "tint",        shorthand: "tint"         }, // --md-sys-color-surface-tint
          ],
          variationTargets: [4.5, 14.0, 1.3, 12.0, 2.5, 4.5],
          description: "Primary color family · fill · on · container · on-container · inverse · tint",
        },

        // ── SECONDARY ───────────────────────────────────────────────────────────
        // Color source: secondary (#625B71)
        {
          name: "secondary",
          shorthand: "secondary",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",      shorthand: "default"      }, // --md-sys-color-secondary
            { name: "on",          shorthand: "on"           }, // --md-sys-color-on-secondary
            { name: "container",   shorthand: "container"    }, // --md-sys-color-secondary-container
            { name: "on-container", shorthand: "on-container" }, // --md-sys-color-on-secondary-container
          ],
          variationTargets: [4.5, 14.0, 1.3, 12.0],
          description: "Secondary color family · fill · on · container · on-container",
        },

        // ── TERTIARY ────────────────────────────────────────────────────────────
        // Color source: tertiary (#7D5260)
        {
          name: "tertiary",
          shorthand: "tertiary",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",      shorthand: "default"      }, // --md-sys-color-tertiary
            { name: "on",          shorthand: "on"           }, // --md-sys-color-on-tertiary
            { name: "container",   shorthand: "container"    }, // --md-sys-color-tertiary-container
            { name: "on-container", shorthand: "on-container" }, // --md-sys-color-on-tertiary-container
          ],
          variationTargets: [4.5, 14.0, 1.3, 12.0],
          description: "Tertiary color family · fill · on · container · on-container",
        },

        // ── ERROR ───────────────────────────────────────────────────────────────
        // Color source: error (#B3261E)
        {
          name: "error",
          shorthand: "error",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default",      shorthand: "default"      }, // --md-sys-color-error
            { name: "on",          shorthand: "on"           }, // --md-sys-color-on-error
            { name: "container",   shorthand: "container"    }, // --md-sys-color-error-container
            { name: "on-container", shorthand: "on-container" }, // --md-sys-color-on-error-container
          ],
          variationTargets: [4.5, 14.0, 1.3, 12.0],
          description: "Error color family · fill · on · container · on-container",
        },

        // ── SURFACE ─────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        // surface/default · dim · bright — the three base surface states
        {
          name: "surface",
          shorthand: "surface",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // --md-sys-color-surface
            { name: "dim",     shorthand: "dim"     }, // --md-sys-color-surface-dim
            { name: "bright",  shorthand: "bright"  }, // --md-sys-color-surface-bright
          ],
          variationTargets: [1.0, 1.07, 1.0],
          description: "Surface states · default · dim · bright",
        },

        // surface/container/* — 5-step container stack nested under surface
        {
          name: "surface/container",
          shorthand: "surface/container",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "lowest",  shorthand: "lowest"  }, // --md-sys-color-surface-container-lowest
            { name: "low",     shorthand: "low"     }, // --md-sys-color-surface-container-low
            { name: "default", shorthand: "default" }, // --md-sys-color-surface-container
            { name: "high",    shorthand: "high"    }, // --md-sys-color-surface-container-high
            { name: "highest", shorthand: "highest" }, // --md-sys-color-surface-container-highest
          ],
          variationTargets: [1.0, 1.07, 1.15, 1.22, 1.3],
          description: "Surface container stack · 5 levels of tint depth",
        },

        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "background",
          shorthand: "background",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // --md-sys-color-background
            { name: "on",      shorthand: "on"      }, // --md-sys-color-on-background
          ],
          variationTargets: [1.0, 10.0],
          description: "Background · page canvas and body text",
        },

        // ── INVERSE ─────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        // inverse/surface — snackbar / tooltip panel background
        {
          name: "inverse",
          shorthand: "inverse",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "surface", shorthand: "surface" }, // --md-sys-color-inverse-surface
          ],
          variationTargets: [12.0],
          description: "Inverse surface · snackbar/tooltip background",
        },

        // ── SCRIM ───────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "scrim",
          shorthand: "scrim",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // --md-sys-color-scrim
          ],
          variationTargets: [16.0],
          description: "Scrim · modal overlay, darkest achievable",
        },

        // ── SHADOW ──────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "shadow",
          shorthand: "shadow",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // --md-sys-color-shadow
          ],
          variationTargets: [16.0],
          description: "Shadow · elevation drop shadow, darkest achievable",
        },

        // ── ON-SURFACE / SURFACE-VARIANT / OUTLINE / INVERSE-ON-SURFACE ─────────
        // Color source: neutral-variant (#7D7279)
        // Grouped into surface role for on/variant/on-variant slots
        {
          name: "surface",
          shorthand: "surface",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "on",         shorthand: "on"         }, // --md-sys-color-on-surface
            { name: "variant",    shorthand: "variant"    }, // --md-sys-color-surface-variant
            { name: "on-variant", shorthand: "on-variant" }, // --md-sys-color-on-surface-variant
          ],
          variationTargets: [10.0, 1.2, 4.5],
          description: "Surface text and variant · on-surface · surface-variant · on-surface-variant",
        },

        // outline/default and outline/variant
        {
          name: "outline",
          shorthand: "outline",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "default", shorthand: "default" }, // --md-sys-color-outline
            { name: "variant", shorthand: "variant" }, // --md-sys-color-outline-variant
          ],
          variationTargets: [3.0, 1.5],
          description: "Outline · interactive border · decorative divider",
        },

        // inverse/on-surface — text on inverse-surface (near-white in light theme)
        {
          name: "inverse",
          shorthand: "inverse",
          minContrast: 1.0,
          customVariationList: true,
          customVariations: [
            { name: "on-surface", shorthand: "on-surface" }, // --md-sys-color-inverse-on-surface
          ],
          variationTargets: [1.1],
          description: "Inverse on-surface · near-white text on snackbar bg",
        },

      ],

      themes: [
        { name: "Light", bg: "FFFBFE" },
        { name: "Dark",  bg: "1C1B1F" },
      ],
    },
  },
];

export default presets;
