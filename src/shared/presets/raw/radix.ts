/**
 * Radix UI / Radix Themes preset.
 *
 * Role = semantic layer. Variations = the named slots within that layer.
 *
 * Radix's 12-step scale has fixed semantic meanings per step:
 *   1  = App background           7  = UI element border and focus rings
 *   2  = Subtle background        8  = Hovered UI element border
 *   3  = UI element background    9  = Solid backgrounds
 *   4  = Hovered UI element bg   10  = Hovered solid backgrounds
 *   5  = Active / selected bg    11  = Low-contrast text
 *   6  = Subtle borders          12  = High-contrast text
 *
 * Collection names match Radix Themes / shadcn conventions:
 *   scaleCollectionName: "primitives"  → the raw 12-step tonal ramps
 *   tokenCollectionName: "tokens"      → semantic role tokens
 *
 * Role/variation architecture (role = purpose layer, variation = slot within layer):
 *   background/       app · subtle
 *   element/          default · hover · active
 *   border/           subtle · ui · hover
 *   solid/            default · hover
 *   text/             low · high
 *   overlay/          default
 *
 * Contrast targets per slot (solved against theme bg #FFFFFF light / #111113 dark):
 *   background/app       1.0   page canvas
 *   background/subtle    1.05  tinted off-white / off-black
 *   element/default      1.1   component resting fill
 *   element/hover        1.15  component hover fill
 *   element/active       1.2   component active/selected fill
 *   border/subtle        1.5   decorative separator
 *   border/ui            2.5   interactive border
 *   border/hover         3.0   hovered interactive border
 *   solid/default        4.5   AA solid fill (button bg)
 *   solid/hover          5.5   hovered solid fill
 *   text/low             3.0   supplementary / muted text (AA-large)
 *   text/high            7.0   primary body text (AA strict)
 *   overlay/default     14.0   scrim / backdrop overlay
 */

import type { Preset } from "../themeShop";

const presets: Preset[] = [
  {
    id: "radix-ui",
    name: "Radix UI",
    badge: "Radix",
    description: "Radix's 12-step semantic scale. Role = purpose layer (background, element, border, solid, text). Variation = named slot within that layer. Matches Radix Themes and shadcn/ui token namespace.",
    tags: ["radix", "shadcn", "oklch", "12-step", "react"],
    swatches: ["0091FF", "8E8096", "EB5757", "30A46C"],
    config: {
      name: "Radix UI",
      pluginMode: "scale",
      scaleAlgorithm: "Natural",
      scaleLength: 12,
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
      alphaValues: [5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95],
      includeColorScalesCollection: true,
      includeDescriptions: true,
      scaleCollectionName: "primitives",
      tokenCollectionName: "tokens",

      scaleSteps: null,
      useSharedRoleVariants: false,

      // Global variations — not used directly (every role defines its own).
      variations: [{ name: "default", shorthand: "default" }],

      colors: [
        { name: "Blue", shorthand: "Blue", value: "0091FF", description: "Radix blue — primary interactive tint" },
        { name: "Mauve", shorthand: "Mauve", value: "8E8096", description: "Radix mauve neutral (purple-tinted gray)" },
        { name: "Red", shorthand: "Red", value: "EB5757", description: "Radix red — error / destructive" },
        { name: "Green", shorthand: "Green", value: "30A46C", description: "Radix green — success / positive" },
      ],

      roles: [
        // ── BACKGROUND ──────────────────────────────────────────────────────────
        // Steps 1–2: page and subtle background fills
        {
          name: "background",
          shorthand: "background",
          variations: [
            { name: "app", shorthand: "app", target: 1.0 }, // step 1 — page/app background
            { name: "subtle", shorthand: "subtle", target: 1.05 }, // step 2 — tinted off-white/off-black
          ],
          description: "Page background fills · app canvas and subtle tint",
        },

        // ── ELEMENT ─────────────────────────────────────────────────────────────
        // Steps 3–5: UI component fills — resting / hover / active
        {
          name: "element",
          shorthand: "element",
          variations: [
            { name: "default", shorthand: "default", target: 1.1 }, // step 3 — component resting fill
            { name: "hover", shorthand: "hover", target: 1.15 }, // step 4 — component hover fill
            { name: "active", shorthand: "active", target: 1.2 }, // step 5 — active/selected component fill
          ],
          description: "UI element fills · resting · hover · active",
        },

        // ── BORDER ──────────────────────────────────────────────────────────────
        // Steps 6–8: separators, interactive borders, hovered borders
        {
          name: "border",
          shorthand: "border",
          variations: [
            { name: "subtle", shorthand: "subtle", target: 1.5 }, // step 6 — decorative separator
            { name: "ui", shorthand: "ui", target: 2.5 }, // step 7 — interactive border / focus ring
            { name: "hover", shorthand: "hover", target: 3.0 }, // step 8 — hovered interactive border
          ],
          description: "Borders and separators · subtle divider · UI border · hover border",
        },

        // ── SOLID ───────────────────────────────────────────────────────────────
        // Steps 9–10: solid fills (button bg, badge bg) — resting and hover
        {
          name: "solid",
          shorthand: "solid",
          variations: [
            { name: "default", shorthand: "default", target: 4.5 }, // step 9  — solid fill (primary button bg)
            { name: "hover", shorthand: "hover", target: 5.5 }, // step 10 — hovered solid fill
          ],
          description: "Solid fills · button/badge backgrounds · resting and hover",
        },

        // ── TEXT ────────────────────────────────────────────────────────────────
        // Steps 11–12: supplementary text and high-contrast body text
        {
          name: "text",
          shorthand: "text",
          variations: [
            { name: "low", shorthand: "low", target: 3.0 }, // step 11 — muted / supplementary text (AA-large)
            { name: "high", shorthand: "high", target: 7.0 }, // step 12 — primary body text (AA strict)
          ],
          description: "Text contrast tiers · low-contrast muted · high-contrast body",
        },

        // ── OVERLAY ─────────────────────────────────────────────────────────────
        // Scrim/backdrop — darkest achievable from neutral hue family
        {
          name: "overlay",
          shorthand: "overlay",
          variations: [{ name: "default", shorthand: "default", target: 14.0 }],
          description: "Overlay scrim · modal and drawer backdrop",
        },
      ],

      themes: [
        { name: "Light", bg: "FFFFFF" },
        { name: "Dark", bg: "111113" },
      ],
    },
  },
];

export default presets;
