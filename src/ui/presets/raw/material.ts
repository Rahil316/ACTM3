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

import type { Preset } from "../themeShop";

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
      includeSourceColors: false,
      sourceCollectionName: "global",
      alphaValues: [5, 10, 20, 25, 50, 75, 80, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",

      scaleSteps: null,

      // Global variations — not used directly (all roles use customVariationList).
      // Defined so the config is valid.
      variations: [{ name: "default", shorthand: "default" }],

      // ── Key colors ──────────────────────────────────────────────────────────
      // color.name = top-level Figma group. tokenNameSegments["color"] is suppressed
      // by naming colors with a single empty-path label — the role carries the full path.
      // We name each color with an empty string so only role+variation appear in the path.
      colors: [
        { name: "primary", shorthand: "primary", value: "6750A4", description: "M3 Primary key color" },
        { name: "secondary", shorthand: "secondary", value: "625B71", description: "M3 Secondary key color" },
        { name: "tertiary", shorthand: "tertiary", value: "7D5260", description: "M3 Tertiary key color" },
        { name: "error", shorthand: "error", value: "B3261E", description: "M3 Error key color" },
        { name: "neutral", shorthand: "neutral", value: "605D62", description: "M3 Neutral — surfaces, backgrounds, shadow" },
        { name: "neutral-variant", shorthand: "neutral-variant", value: "7D7279", description: "M3 Neutral Variant — on-surface, outline" },
      ],

      roles: [
        // ── PRIMARY ─────────────────────────────────────────────────────────────
        // Color source: primary (#6750A4)
        {
          name: "primary",
          shorthand: "primary",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // --md-sys-color-primary
            { name: "on", shorthand: "on", target: 14.0 }, // --md-sys-color-on-primary
            { name: "container", shorthand: "container", target: 1.3 }, // --md-sys-color-primary-container
            { name: "on-container", shorthand: "on-container", target: 12.0 }, // --md-sys-color-on-primary-container
            { name: "inverse", shorthand: "inverse", target: 2.5 }, // --md-sys-color-inverse-primary
            { name: "tint", shorthand: "tint", target: 4.5 }, // --md-sys-color-surface-tint
          ],
          description: "Primary color family · fill · on · container · on-container · inverse · tint",
        },

        // ── SECONDARY ───────────────────────────────────────────────────────────
        // Color source: secondary (#625B71)
        {
          name: "secondary",
          shorthand: "secondary",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // --md-sys-color-secondary
            { name: "on", shorthand: "on", target: 14.0 }, // --md-sys-color-on-secondary
            { name: "container", shorthand: "container", target: 1.3 }, // --md-sys-color-secondary-container
            { name: "on-container", shorthand: "on-container", target: 12.0 }, // --md-sys-color-on-secondary-container
          ],
          description: "Secondary color family · fill · on · container · on-container",
        },

        // ── TERTIARY ────────────────────────────────────────────────────────────
        // Color source: tertiary (#7D5260)
        {
          name: "tertiary",
          shorthand: "tertiary",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // --md-sys-color-tertiary
            { name: "on", shorthand: "on", target: 14.0 }, // --md-sys-color-on-tertiary
            { name: "container", shorthand: "container", target: 1.3 }, // --md-sys-color-tertiary-container
            { name: "on-container", shorthand: "on-container", target: 12.0 }, // --md-sys-color-on-tertiary-container
          ],
          description: "Tertiary color family · fill · on · container · on-container",
        },

        // ── ERROR ───────────────────────────────────────────────────────────────
        // Color source: error (#B3261E)
        {
          name: "error",
          shorthand: "error",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // --md-sys-color-error
            { name: "on", shorthand: "on", target: 14.0 }, // --md-sys-color-on-error
            { name: "container", shorthand: "container", target: 1.3 }, // --md-sys-color-error-container
            { name: "on-container", shorthand: "on-container", target: 12.0 }, // --md-sys-color-on-error-container
          ],
          description: "Error color family · fill · on · container · on-container",
        },

        // ── SURFACE ─────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        // surface/default · dim · bright — the three base surface states
        {
          name: "surface",
          shorthand: "surface",
          variations: [
            { name: "default", shorthand: "default", target: 1.0 }, // --md-sys-color-surface
            { name: "dim", shorthand: "dim", target: 1.07 }, // --md-sys-color-surface-dim
            { name: "bright", shorthand: "bright", target: 1.0 }, // --md-sys-color-surface-bright
          ],
          description: "Surface states · default · dim · bright",
        },

        // surface/container/* — 5-step container stack nested under surface
        {
          name: "surface/container",
          shorthand: "surface/container",
          variations: [
            { name: "lowest", shorthand: "lowest", target: 1.0 }, // --md-sys-color-surface-container-lowest
            { name: "low", shorthand: "low", target: 1.07 }, // --md-sys-color-surface-container-low
            { name: "default", shorthand: "default", target: 1.15 }, // --md-sys-color-surface-container
            { name: "high", shorthand: "high", target: 1.22 }, // --md-sys-color-surface-container-high
            { name: "highest", shorthand: "highest", target: 1.3 }, // --md-sys-color-surface-container-highest
          ],
          description: "Surface container stack · 5 levels of tint depth",
        },

        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "background",
          shorthand: "background",
          variations: [
            { name: "default", shorthand: "default", target: 1.0 }, // --md-sys-color-background
            { name: "on", shorthand: "on", target: 10.0 }, // --md-sys-color-on-background
          ],
          description: "Background · page canvas and body text",
        },

        // ── INVERSE ─────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        // inverse/surface — snackbar / tooltip panel background
        {
          name: "inverse",
          shorthand: "inverse",
          variations: [
            { name: "surface", shorthand: "surface", target: 12.0 }, // --md-sys-color-inverse-surface
          ],
          description: "Inverse surface · snackbar/tooltip background",
        },

        // ── SCRIM ───────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "scrim",
          shorthand: "scrim",
          variations: [
            { name: "default", shorthand: "default", target: 16.0 }, // --md-sys-color-scrim
          ],
          description: "Scrim · modal overlay, darkest achievable",
        },

        // ── SHADOW ──────────────────────────────────────────────────────────────
        // Color source: neutral (#605D62)
        {
          name: "shadow",
          shorthand: "shadow",
          variations: [
            { name: "default", shorthand: "default", target: 16.0 }, // --md-sys-color-shadow
          ],
          description: "Shadow · elevation drop shadow, darkest achievable",
        },

        // ── ON-SURFACE / SURFACE-VARIANT / OUTLINE / INVERSE-ON-SURFACE ─────────
        // Color source: neutral-variant (#7D7279)
        // Grouped into surface role for on/variant/on-variant slots
        {
          name: "surface",
          shorthand: "surface",
          variations: [
            { name: "on", shorthand: "on", target: 10.0 }, // --md-sys-color-on-surface
            { name: "variant", shorthand: "variant", target: 1.2 }, // --md-sys-color-surface-variant
            { name: "on-variant", shorthand: "on-variant", target: 4.5 }, // --md-sys-color-on-surface-variant
          ],
          description: "Surface text and variant · on-surface · surface-variant · on-surface-variant",
        },

        // outline/default and outline/variant
        {
          name: "outline",
          shorthand: "outline",
          variations: [
            { name: "default", shorthand: "default", target: 3.0 }, // --md-sys-color-outline
            { name: "variant", shorthand: "variant", target: 1.5 }, // --md-sys-color-outline-variant
          ],
          description: "Outline · interactive border · decorative divider",
        },

        // inverse/on-surface — text on inverse-surface (near-white in light theme)
        {
          name: "inverse",
          shorthand: "inverse",
          variations: [
            { name: "on-surface", shorthand: "on-surface", target: 1.1 }, // --md-sys-color-inverse-on-surface
          ],
          description: "Inverse on-surface · near-white text on snackbar bg",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFBFE" },
        { name: "Dark", bg: "1C1B1F" },
      ],
    },
  },
];

export default presets;
