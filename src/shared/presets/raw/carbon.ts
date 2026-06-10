/**
 * IBM Carbon Design System preset.
 *
 * Role = semantic layer group. Variations = the named slots within that group.
 *
 * Carbon's token architecture: Interactive > Layer > Text > Field > Border > Support.
 * The Uniform algorithm distributes lightness steps evenly — matching Carbon's
 * hand-tuned palette philosophy where step intervals are perceptually equal.
 *
 * Collection names match Carbon's published system:
 *   scaleCollectionName: "ibm-colors"   → IBM color palette ramps (global primitives)
 *   tokenCollectionName: "carbon"        → semantic component tokens
 *
 * Four Carbon themes, all supported:
 *   White (#FFFFFF), Gray-10 (#F4F4F4), Gray-90 (#262626), Gray-100 (#161616)
 *
 * Role/variation architecture (role = semantic group, variation = slot within group):
 *   interactive/      default · hover · active · disabled
 *   layer/            01 · 02 · 03
 *   layer/hover/      01 · 02 · 03
 *   text/             primary · secondary · placeholder · on-color
 *   field/            01 · 02
 *   border/           subtle · strong · interactive
 *   support/error/    bg · fg · border · icon
 *   support/warning/  bg · fg · border · icon
 *   support/success/  bg · fg · border · icon
 *
 * Contrast targets per slot (solved against each theme bg):
 *   interactive/default    4.0   AA-large fill
 *   interactive/hover      5.5   hover (one stop darker)
 *   interactive/active     7.5   pressed / active
 *   interactive/disabled   2.0   below action threshold
 *   layer/01               1.1   base page surface (Gray-10 equivalent)
 *   layer/02               1.3   card / panel
 *   layer/03               1.6   nested content area
 *   layer/hover/*          one stop darker than corresponding layer
 *   text/primary          11.0   high-contrast body (AAA)
 *   text/secondary         5.5   supporting labels
 *   text/placeholder       4.0   input hints
 *   text/on-color          1.0   white text on dark fills
 *   field/01               1.1   input field on White theme
 *   field/02               1.3   input field on Gray-10 theme
 *   border/subtle          1.8   hairline divider
 *   border/strong          4.0   form field border
 *   border/interactive     5.5   focus ring / selection border
 *   support/[channel]/bg      1.3   tinted status background
 *   support/[channel]/fg      5.5   status text / icon foreground
 *   support/[channel]/border  2.5   status field border
 *   support/[channel]/icon    4.0   status icon fill
 */

import type { Preset } from "../themeShop";

const presets: Preset[] = [
  {
    id: "ibm-carbon",
    name: "IBM Carbon",
    badge: "Carbon",
    description: "IBM Carbon enterprise token architecture. Role = semantic layer group. Variation = named slot within that group. All four Carbon themes (White, Gray-10, Gray-90, Gray-100) with full Interactive/Layer/Text/Field/Border/Support coverage.",
    tags: ["ibm", "carbon", "enterprise", "uniform", "10-step"],
    swatches: ["0F62FE", "8D8D8D", "DA1E28", "F1C21B", "198038"],
    config: {
      name: "IBM Carbon",
      pluginMode: "scale",
      scaleAlgorithm: "Uniform",
      scaleLength: 10,
      useUniformAlgorithm: true,
      algorithmScopeLevel: "color",
      solverMode: "natural",
      tokenNameSegments: ["color", "role", "variation"],
      useShorthandColors: false,
      useShorthandRoles: false,
      useShorthandVariations: false,
      useShorthandSteps: false,
      includeSourceColors: false,
      sourceCollectionName: "global",
      alphaValues: [5, 10, 20, 25, 50, 75, 80, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "ibm-colors",
      tokenCollectionName: "carbon",

      scaleSteps: null,

      // Global variations — not used directly (all roles use customVariationList).
      variations: [{ name: "default", shorthand: "default" }],

      colors: [
        { name: "Interactive/Blue", shorthand: "Interactive/Blue", value: "0F62FE", description: "Carbon interactive blue — primary actions" },
        { name: "Neutral/Gray", shorthand: "Neutral/Gray", value: "8D8D8D", description: "Carbon neutral gray — surfaces, borders, text" },
        { name: "Support/Error", shorthand: "Support/Error", value: "DA1E28", description: "Carbon support error (red)" },
        { name: "Support/Warning", shorthand: "Support/Warning", value: "F1C21B", description: "Carbon support warning (yellow)" },
        { name: "Support/Success", shorthand: "Support/Success", value: "198038", description: "Carbon support success (green)" },
      ],

      roles: [
        // ── INTERACTIVE ─────────────────────────────────────────────────────────
        // Primary interactive fill: button, link, focus ring — 4 interaction states.
        {
          name: "interactive",
          shorthand: "interactive",
          variations: [
            { name: "default", shorthand: "default", target: 4.0 }, // resting interactive fill
            { name: "hover", shorthand: "hover", target: 5.5 }, // hover (one stop darker)
            { name: "active", shorthand: "active", target: 7.5 }, // pressed / active
            { name: "disabled", shorthand: "disabled", target: 2.0 }, // disabled (muted)
          ],
          description: "Primary interactive fills · button · link · focus ring · 4 states",
        },

        // ── LAYER ───────────────────────────────────────────────────────────────
        // Background layering: layer-01 / layer-02 / layer-03.
        // Shallow steps create subtle depth hierarchy.
        {
          name: "layer",
          shorthand: "layer",
          variations: [
            { name: "01", shorthand: "01", target: 1.1 }, // base page surface (Gray-10 equivalent)
            { name: "02", shorthand: "02", target: 1.3 }, // card / panel
            { name: "03", shorthand: "03", target: 1.6 }, // nested content area
          ],
          description: "Background layer stack · page surface · card · nested panel",
        },

        // ── LAYER / HOVER ────────────────────────────────────────────────────────
        // Hover overlay for each layer — one stop darker than the corresponding layer.
        {
          name: "layer/hover",
          shorthand: "layer/hover",
          variations: [
            { name: "01", shorthand: "01", target: 1.3 }, // hover on layer-01
            { name: "02", shorthand: "02", target: 1.6 }, // hover on layer-02
            { name: "03", shorthand: "03", target: 2.0 }, // hover on layer-03
          ],
          description: "Hover tints for each background layer",
        },

        // ── TEXT ────────────────────────────────────────────────────────────────
        // Carbon text hierarchy: primary / secondary / placeholder / on-color.
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "primary", shorthand: "primary", target: 11.0 }, // high-contrast body text
            { name: "secondary", shorthand: "secondary", target: 5.5 }, // supporting labels
            { name: "placeholder", shorthand: "placeholder", target: 4.0 }, // input hints
            { name: "on-color", shorthand: "on-color", target: 1.0 }, // white text on dark fills
          ],
          description: "Text token hierarchy · primary · secondary · placeholder · on-color",
        },

        // ── FIELD ───────────────────────────────────────────────────────────────
        // Input field backgrounds matching Carbon's two-theme field pattern.
        {
          name: "field",
          shorthand: "field",
          variations: [
            { name: "01", shorthand: "01", target: 1.1 }, // field on White theme
            { name: "02", shorthand: "02", target: 1.3 }, // field on Gray-10 theme
          ],
          description: "Input field background fills · field-01 and field-02",
        },

        // ── BORDER ──────────────────────────────────────────────────────────────
        // borderSubtle / borderStrong / borderInteractive.
        {
          name: "border",
          shorthand: "border",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.8 }, // hairline divider
            { name: "strong", shorthand: "strong", target: 4.0 }, // form field border
            { name: "interactive", shorthand: "interactive", target: 5.5 }, // focus ring / selection
          ],
          description: "Border and divider hierarchy · subtle · strong · interactive",
        },

        // ── FOCUS ───────────────────────────────────────────────────────────────
        // Carbon's standalone $focus token — keyboard focus ring, always the brand blue.
        // Separate from borderInteractive because it applies as an outline, not a fill.
        {
          name: "focus",
          shorthand: "focus",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // $focus — blue focus ring
            { name: "inset", shorthand: "inset", target: 14.0 },    // $focus-inset — white inset ring on dark fills
          ],
          description: "Focus ring · default keyboard outline · inset ring on dark fills",
        },

        // ── SUPPORT / ERROR ──────────────────────────────────────────────────────
        {
          name: "support/error",
          shorthand: "support/error",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.3 }, // error background tint
            { name: "fg", shorthand: "fg", target: 5.5 }, // error text / icon foreground
            { name: "border", shorthand: "border", target: 2.5 }, // error field border
            { name: "icon", shorthand: "icon", target: 4.0 }, // error icon fill
          ],
          description: "Error semantic token stack · bg · fg · border · icon",
        },

        // ── SUPPORT / WARNING ────────────────────────────────────────────────────
        {
          name: "support/warning",
          shorthand: "support/warning",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.3 },
            { name: "fg", shorthand: "fg", target: 5.5 },
            { name: "border", shorthand: "border", target: 2.5 },
            { name: "icon", shorthand: "icon", target: 4.0 },
          ],
          description: "Warning semantic token stack · bg · fg · border · icon",
        },

        // ── SUPPORT / SUCCESS ────────────────────────────────────────────────────
        {
          name: "support/success",
          shorthand: "support/success",
          variations: [
            { name: "bg", shorthand: "bg", target: 1.3 },
            { name: "fg", shorthand: "fg", target: 5.5 },
            { name: "border", shorthand: "border", target: 2.5 },
            { name: "icon", shorthand: "icon", target: 4.0 },
          ],
          description: "Success semantic token stack · bg · fg · border · icon",
        },
      ],

      themes: [
        { name: "White", bg: "FFFFFF" },
        { name: "Gray-10", bg: "F4F4F4" },
        { name: "Gray-90", bg: "262626" },
        { name: "Gray-100", bg: "161616" },
      ],
    },
  },
];

export default presets;
