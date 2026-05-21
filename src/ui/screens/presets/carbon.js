/**
 * IBM Carbon Design System preset.
 * Tonal mode, Uniform algorithm, scaleLength=10.
 * variationTargets = ramp step indices 0–9.
 *
 * Carbon's token architecture: Interactive > Layer > Text > Field > Border > Support.
 * The Uniform algorithm distributes lightness steps evenly — matching Carbon's
 * hand-tuned palette philosophy where step intervals are perceptually equal.
 *
 * scaleLength=10 gives Carbon's 10 tones (10→100 in Carbon's own 10-stop format).
 *
 * Step intent reference (Uniform algo, 10 steps, neutral seed):
 *   0 = 1.0:1  → White (#FFFFFF equivalent) — pure surface
 *   1 = 1.2:1  → Gray-10 subtle layer
 *   2 = 1.5:1  → Gray-20 card / field
 *   3 = 2.0:1  → Gray-30 border / muted fill
 *   4 = 2.8:1  → Gray-40 disabled / placeholder
 *   5 = 4.0:1  → Gray-50 mid (AA large text)
 *   6 = 5.5:1  → Gray-60 interactive fill
 *   7 = 7.5:1  → Gray-70 AA normal text
 *   8 = 11:1   → Gray-80 strong text / AAA
 *   9 = 18:1   → Gray-100 near-black / inverse surface
 *
 * Four Carbon themes: White, Gray-10, Gray-90, Gray-100.
 * Carbon supports all four as background contexts in a single design system.
 */

const CARBON_PRESETS = [
  {
    id: "ibm-carbon",
    name: "IBM Carbon",
    badge: "Carbon",
    description: "IBM Carbon's enterprise token architecture. Layer/Text/Field/Border/Support groups with all four Carbon themes (White, Gray-10, Gray-90, Gray-100).",
    tags: ["ibm", "carbon", "enterprise", "uniform", "10-step"],
    swatches: ["0F62FE", "8D8D8D", "DA1E28", "F1C21B", "198038"],
    config: {
      name: "IBM Carbon",
      pluginMode: "scale",
      scaleAlgorithm: "Uniform",
      scaleLength: 10,
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
      includeTonalCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "_scale",
      tokenCollectionName: "color tokens",
      perRoleControls: false,
      scaleStepNames: [],

      // Global 4-state interaction variations.
      // Carbon Interactive uses Default/Hover/Active pattern (no disabled at global level —
      // disabled is handled per-role in Text and Layer families).
      variations: [
        { name: "State/Default",  shorthand: "d"  }, // step 5 — mid interactive fill
        { name: "State/Hover",    shorthand: "h"  }, // step 6 — hover (one step darker)
        { name: "State/Active",   shorthand: "a"  }, // step 7 — pressed / active
        { name: "State/Disabled", shorthand: "ds" }, // step 3 — muted disabled state
      ],

      colors: [
        { name: "Interactive/Blue",    shorthand: "ib", value: "0F62FE", description: "Carbon interactive blue — primary actions" },
        { name: "Neutral/Gray",        shorthand: "ng", value: "8D8D8D", description: "Carbon neutral gray — surfaces, borders, text" },
        { name: "Support/Error",       shorthand: "er", value: "DA1E28", description: "Carbon support error (red)" },
        { name: "Support/Warning",     shorthand: "wa", value: "F1C21B", description: "Carbon support warning (yellow)" },
        { name: "Support/Success",     shorthand: "su", value: "198038", description: "Carbon support success (green)" },
      ],

      roles: [
        // ── Interactive roles (global 4-state) ──────────────────────────────
        {
          name: "Interactive",
          shorthand: "in",
          minContrast: 3.0,
          variationTargets: [4.0, 5.5, 7.5, 2.0],
          description: "Primary interactive element fills — button, link, focus ring",
        },

        // ── Layer roles ──────────────────────────────────────────────────────
        // Carbon's background layering: layer-01 / layer-02 / layer-03.
        // Intentionally shallow steps (1/2/3) to create subtle depth hierarchy.
        {
          name: "Layer",
          shorthand: "la",
          minContrast: 1.0,
          variationOverride: true,
          roleVariations: [
            { name: "01", shorthand: "l1" }, // step 1 — base page surface (Gray-10)
            { name: "02", shorthand: "l2" }, // step 2 — card / panel (Gray-20)
            { name: "03", shorthand: "l3" }, // step 3 — nested content area (Gray-30)
          ],
          variationTargets: [1.1, 1.3, 1.6],
          description: "Background layer stack — page surface, card, nested panel",
        },

        // ── Layer hover states ───────────────────────────────────────────────
        // Hover state for each layer — one step darker than the layer itself.
        {
          name: "Layer/Hover",
          shorthand: "lah",
          minContrast: 1.0,
          variationOverride: true,
          roleVariations: [
            { name: "01", shorthand: "l1" }, // step 2 — hover on layer-01
            { name: "02", shorthand: "l2" }, // step 3 — hover on layer-02
            { name: "03", shorthand: "l3" }, // step 4 — hover on layer-03
          ],
          variationTargets: [1.3, 1.6, 2.0],
          description: "Hover overlay tints for each background layer",
        },

        // ── Text roles ───────────────────────────────────────────────────────
        // Carbon text hierarchy: primary / secondary / placeholder / on-color / helper / error.
        {
          name: "Text",
          shorthand: "tx",
          minContrast: 4.5,
          variationOverride: true,
          roleVariations: [
            { name: "Primary",     shorthand: "p"  }, // step 8 — textPrimary (high contrast body)
            { name: "Secondary",   shorthand: "s"  }, // step 6 — textSecondary (supporting labels)
            { name: "Placeholder", shorthand: "ph" }, // step 5 — textPlaceholder (input hints)
            { name: "On-Color",    shorthand: "oc" }, // step 0 — white text on dark fills
          ],
          variationTargets: [11.0, 5.5, 4.0, 1.0],
          description: "Text token hierarchy — primary, secondary, placeholder, on-color",
        },

        // ── Border roles ─────────────────────────────────────────────────────
        // borderSubtle / borderStrong / borderInteractive.
        {
          name: "Border",
          shorthand: "bo",
          minContrast: 1.5,
          variationOverride: true,
          roleVariations: [
            { name: "Subtle",      shorthand: "su" }, // step 3 — borderSubtle (hairline divider)
            { name: "Strong",      shorthand: "st" }, // step 5 — borderStrong (form fields)
            { name: "Interactive", shorthand: "in" }, // step 6 — borderInteractive (focus, selection)
          ],
          variationTargets: [1.8, 4.0, 5.5],
          description: "Border and divider hierarchy",
        },

        // ── Field roles ──────────────────────────────────────────────────────
        // Input field backgrounds. field-01 / field-02 match Carbon's layering exactly.
        {
          name: "Field",
          shorthand: "fi",
          minContrast: 1.0,
          variationOverride: true,
          roleVariations: [
            { name: "01", shorthand: "f1" }, // step 1 — field on White theme
            { name: "02", shorthand: "f2" }, // step 2 — field on Gray-10 theme
          ],
          variationTargets: [1.1, 1.3],
          description: "Input / form field background fills",
        },

        // ── Support roles (use global 4-state) ──────────────────────────────
        // Error / Warning / Success use global Default/Hover/Active/Disabled for their
        // full interactive state coverage (e.g. error field → hover error field).
        {
          name: "Support/Error",
          shorthand: "ser",
          minContrast: 3.0,
          variationOverride: true,
          roleVariations: [
            { name: "BG",     shorthand: "bg" }, // step 2 — error background tint
            { name: "FG",     shorthand: "fg" }, // step 6 — error icon / text fill
            { name: "Border", shorthand: "bo" }, // step 4 — error field border
            { name: "Icon",   shorthand: "ic" }, // step 5 — error icon (interactive)
          ],
          variationTargets: [1.3, 5.5, 2.5, 4.0],
          description: "Error semantic token stack",
        },
        {
          name: "Support/Warning",
          shorthand: "swa",
          minContrast: 3.0,
          variationOverride: true,
          roleVariations: [
            { name: "BG",     shorthand: "bg" },
            { name: "FG",     shorthand: "fg" },
            { name: "Border", shorthand: "bo" },
            { name: "Icon",   shorthand: "ic" },
          ],
          variationTargets: [1.3, 5.5, 2.5, 4.0],
          description: "Warning semantic token stack",
        },
        {
          name: "Support/Success",
          shorthand: "ssu",
          minContrast: 3.0,
          variationOverride: true,
          roleVariations: [
            { name: "BG",     shorthand: "bg" },
            { name: "FG",     shorthand: "fg" },
            { name: "Border", shorthand: "bo" },
            { name: "Icon",   shorthand: "ic" },
          ],
          variationTargets: [1.3, 5.5, 2.5, 4.0],
          description: "Success semantic token stack",
        },
      ],

      themes: [
        { name: "White",    bg: "FFFFFF" },
        { name: "Gray-10",  bg: "F4F4F4" },
        { name: "Gray-90",  bg: "262626" },
        { name: "Gray-100", bg: "161616" },
      ],
    },
  },
];
